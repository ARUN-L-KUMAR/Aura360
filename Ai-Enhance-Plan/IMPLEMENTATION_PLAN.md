# Aura360 Agentic AI — Implementation Plan

Companion to `ARCHITECTURE.md`. That document explains the *design*; this one is the
*build order* — concrete tasks, file-by-file changes, code sketches, and acceptance
criteria for each phase, so you (or a dev) can pick it up and execute without
re-deriving the design.

Estimates assume one developer already familiar with this codebase.

---

## Phase 0 — Prep (30 min)

- [ ] Create a feature flag: `AI_AGENT_ENABLED` env var (default `false` in prod, `true` in dev).
- [ ] Create branch `feat/ai-agent`.
- [ ] Confirm `GEMINI_API_KEY` in `.env` supports the function-calling endpoint (same key works — it's a request-shape change, not a different API).

No behavior change yet — this just gives you a safe on/off switch for everything below.

---

## Phase 1 — Function-calling plumbing (1–2 days)

Goal: prove the full loop end-to-end with **one read-only tool**. Nothing user-facing changes until this works.

### 1.1 Extend `lib/ai/types.ts`
Add types for tool declarations and function-call parts without touching existing exports:

```ts
// lib/ai/types.ts (additions)
export interface AiToolDeclaration {
  name: string
  description: string
  parameters: object // JSON-schema, derived from a zod schema via zod-to-json-schema
}

export interface AiFunctionCall {
  name: string
  args: Record<string, unknown>
}

export interface AiGenerateResult {
  text?: string
  functionCall?: AiFunctionCall
  usage: AIUsageMetadata
}
```

Add `zod-to-json-schema` (small, no other deps) to `package.json`:
```bash
npm install zod-to-json-schema
```

### 1.2 Extend `lib/ai/gemini-client.ts`
Three surgical changes, everything else in the file is untouched:

**a) `buildBody()`** — accept tools:
```ts
function buildBody(
  input: { prompt?: string; messages?: ChatMessage[]; systemPrompt?: string },
  config: GenerationConfig,
  tools?: AiToolDeclaration[]
): object {
  // ...existing contents/systemInstruction/generationConfig code unchanged...

  if (tools && tools.length > 0) {
    body.tools = [{ functionDeclarations: tools }]
    body.toolConfig = { functionCallingConfig: { mode: "AUTO" } }
  }

  return body
}
```

**b) `extractText()` → new `extractResult()`** that also looks for a function call:
```ts
function extractResult(body: Record<string, unknown>): { text?: string; functionCall?: AiFunctionCall } {
  const candidate = (body as any)?.candidates?.[0]
  if (!candidate) throw new GeminiApiError("No candidate received from Gemini")
  const parts = candidate?.content?.parts
  if (!Array.isArray(parts) || parts.length === 0) throw new GeminiApiError("Empty or malformed Gemini response")

  const fnPart = parts.find((p: any) => p.functionCall)
  if (fnPart) return { functionCall: { name: fnPart.functionCall.name, args: fnPart.functionCall.args ?? {} } }

  const text = parts.map((p: any) => p.text || "").filter(Boolean).join("")
  if (!text) throw new GeminiApiError("Empty text in Gemini response")
  return { text }
}
```

**c) New exported method `generateWithTools()`** (keep `generateText`/`generateJson` untouched so `insights-generator`, `smart-search`, etc. keep working exactly as-is):
```ts
async generateWithTools(
  input: { messages: ChatMessage[]; systemPrompt?: string },
  opts: { model?: AIModel; config?: GenerationConfig; tools: AiToolDeclaration[] }
): Promise<AiGenerateResult> {
  // mirrors generateText()'s fetch/retry/timeout logic, but calls buildBody(..., opts.tools)
  // and extractResult() instead of extractText()
}
```

**d) Function response turn** — when the orchestrator has a tool result, it appends a `functionResponse` part and calls `generateWithTools()` again:
```ts
// shape appended to `messages` internally by the orchestrator, not the client:
{ role: "function", parts: [{ functionResponse: { name: toolName, response: { result } } }] }
```
(Gemini's REST API expects this as a `contents` entry with role `"function"` — add a small adapter in `buildBody()` so `ChatMessage` can optionally carry a `functionResponse` field, or extend `ChatMessage` with an optional `functionCall`/`functionResponse` union member.)

### 1.3 Create the tool contract
New file: `lib/ai/tools/types.ts`
```ts
import { z } from "zod"
import type { WorkspaceContext } from "@/lib/db"

export interface AiTool<TArgs = any, TResult = any> {
  name: string
  description: string
  parameters: z.ZodType<TArgs>
  mutates: boolean
  handler: (args: TArgs, ctx: WorkspaceContext) => Promise<TResult>
}
```

### 1.4 First tool (prove the pattern)
New file: `lib/ai/tools/finance.ts` — just `get_transactions` for now, copied from the existing scoped-query pattern in `app/api/finance/transactions/route.ts`:
```ts
import { z } from "zod"
import { db, transactions } from "@/lib/db"
import { and, eq, desc, gte, lte } from "drizzle-orm"
import type { AiTool } from "./types"

export const getTransactions: AiTool = {
  name: "get_transactions",
  description: "Fetch the user's transactions, optionally filtered by date range, type, or category.",
  parameters: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    type: z.enum(["income", "expense", "investment", "transfer"]).optional(),
    category: z.string().optional(),
    limit: z.number().max(200).default(50),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [eq(transactions.workspaceId, ctx.workspaceId), eq(transactions.userId, ctx.userId)]
    if (args.from) conditions.push(gte(transactions.date, args.from))
    if (args.to) conditions.push(lte(transactions.date, args.to))
    if (args.type) conditions.push(eq(transactions.type, args.type))
    if (args.category) conditions.push(eq(transactions.category, args.category))
    return db.select().from(transactions).where(and(...conditions))
      .orderBy(desc(transactions.date)).limit(args.limit)
  },
}
```

New file: `lib/ai/tools/index.ts`
```ts
import { zodToJsonSchema } from "zod-to-json-schema"
import { getTransactions } from "./finance"
import type { AiTool } from "./types"
import type { AiToolDeclaration } from "@/lib/ai/types"

export const toolRegistry: Record<string, AiTool> = {
  [getTransactions.name]: getTransactions,
}

export function getToolDeclarations(): AiToolDeclaration[] {
  return Object.values(toolRegistry).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: zodToJsonSchema(t.parameters, { target: "openApi3" }),
  }))
}
```

### 1.5 Orchestrator
New file: `lib/ai/agent/orchestrator.ts`
```ts
import { geminiClient } from "@/lib/ai/gemini-client"
import { toolRegistry, getToolDeclarations } from "@/lib/ai/tools"
import type { ChatMessage } from "@/lib/ai/types"
import type { WorkspaceContext } from "@/lib/db"

const MAX_TOOL_HOPS = 4

export async function runAgent(ctx: WorkspaceContext, messages: ChatMessage[], systemPrompt: string) {
  const tools = getToolDeclarations()
  let convo = [...messages]
  const trace: { tool: string; args: unknown }[] = []

  for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
    const result = await geminiClient.generateWithTools(
      { messages: convo, systemPrompt },
      { tools, config: { temperature: 0.4, timeoutMs: 30_000 } }
    )

    if (result.text) {
      return { reply: result.text, trace }
    }

    if (result.functionCall) {
      const tool = toolRegistry[result.functionCall.name]
      if (!tool) throw new Error(`Unknown tool requested: ${result.functionCall.name}`)

      const parsedArgs = tool.parameters.parse(result.functionCall.args) // throws on bad args

      // Phase 1: read-only tools only, so no confirmation gate needed yet.
      const toolResult = await tool.handler(parsedArgs, ctx)
      trace.push({ tool: tool.name, args: parsedArgs })

      convo = [
        ...convo,
        { role: "model", content: "", functionCall: result.functionCall } as any,
        { role: "function", content: JSON.stringify(toolResult), functionName: tool.name } as any,
      ]
      continue
    }
  }

  return { reply: "I wasn't able to complete that after several steps — try rephrasing.", trace }
}
```

### 1.6 Wire into the route, behind the flag
`app/api/ai/chat/route.ts` — add a branch, don't replace anything yet:
```ts
if (process.env.AI_AGENT_ENABLED === "true") {
  const { reply, trace } = await runAgent(
    { workspaceId, userId },
    parsed.data.messages,
    SYSTEM_PROMPT_WITH_TOOL_INSTRUCTIONS
  )
  return NextResponse.json({ reply, trace, source: "agent" })
}
// ...existing journalAssistant.chat() path unchanged as fallback...
```

### ✅ Acceptance criteria for Phase 1
- With the flag on, asking "how much did I spend in June?" (a month *not* in the last-10 snapshot) returns a correct answer — proving the model is querying live, not reading a stale snapshot.
- With the flag off, behavior is byte-identical to today.
- `npm run build` passes; no changes to `lib/ai/services/*` behavior (spot-check `insights-generator` still works).

---

## Phase 2 — Full read-tool coverage (2–3 days)

Mechanical repetition of §1.4's pattern across every module. For each, grab the existing scoped-query shape from the module's REST route or from `app/api/ai/context/route.ts` and wrap it as a tool.

| File to create | Tools | Source pattern to copy from |
|---|---|---|
| `lib/ai/tools/fitness.ts` | `get_fitness_logs` | `app/api/fitness/route.ts` |
| `lib/ai/tools/food.ts` | `get_food_logs` | `app/api/food/route.ts` |
| `lib/ai/tools/notes.ts` | `get_notes` | `app/api/notes/route.ts` |
| `lib/ai/tools/fashion.ts` | `get_wardrobe`, `get_wishlist` | `app/api/fashion/route.ts` |
| `lib/ai/tools/skincare.ts` | `get_skincare_routine` | `app/api/skincare/route.ts` |
| `lib/ai/tools/time.ts` | `get_time_logs` | `app/api/time/route.ts` |
| `lib/ai/tools/saved.ts` | `get_saved_items` | `app/api/saved/route.ts` |
| `lib/ai/tools/finance.ts` (extend) | `get_budgets`, `get_financial_goals`, `get_balances` | `app/api/finance/budgets`, `/goals`, `/balances` |

- [ ] Register each new tool in `lib/ai/tools/index.ts`'s `toolRegistry`.
- [ ] Write a short natural-language description per tool — this is what the model uses to decide *when* to call it, so be specific (e.g. "Fetch skincare routine products, optionally filtered by body part or status (active/finished)").
- [ ] Once all read tools exist and are stable, delete the old snapshot-building code path (`getAIContext()` in `app/api/ai/context/route.ts`) or leave it only as the fallback path's input — your call, but don't maintain two divergent context strategies long-term.

### ✅ Acceptance criteria
- Every module is answerable through chat without being in a fixed top-N snapshot (e.g. "what's my oldest wishlist item", "how many hours did I log last week").
- Tool descriptions are specific enough that the model picks the right tool on the first try for a set of ~15 manual test prompts (one or two per module).

---

## Phase 3 — Write actions + confirmation gate (3–4 days)

This is the highest-risk phase — go module by module, ship and test each before moving to the next. Suggested order: **notes → time → fitness/food → fashion → finance** (finance last since money mistakes are the most consequential).

### 3.1 Confirmation gate
New file: `lib/ai/agent/confirmation.ts`
```ts
export interface PendingAction {
  tool: string
  args: unknown
  summary: string // human-readable, shown in the UI
}

export function buildSummary(tool: string, args: any): string {
  switch (tool) {
    case "create_transaction":
      return `Log ${args.type} of ₹${args.amount} under "${args.category}" on ${args.date}?`
    case "log_workout":
      return `Log a ${args.duration}-minute ${args.workoutType} on ${args.date}?`
    case "create_note":
      return `Create note "${args.title}"?`
    default:
      return `Run ${tool}?`
  }
}
```

Orchestrator change: when `tool.mutates === true` and the request isn't already a confirmed follow-up, stop the loop and return:
```ts
if (tool.mutates && !isConfirmed) {
  return {
    reply: null,
    pendingAction: { tool: tool.name, args: parsedArgs, summary: buildSummary(tool.name, parsedArgs) },
    trace,
  }
}
```

Route contract change — request body gains an optional confirm envelope:
```ts
const chatSchema = z.object({
  messages: z.array(...),
  context: z.string().optional(),
  model: z.string().optional(),
  confirm: z.object({ tool: z.string(), args: z.record(z.any()) }).optional(), // new
})
```
When `confirm` is present, the orchestrator skips straight to executing that tool instead of calling Gemini first.

### 3.2 Write tools + audit wiring
For each mutating tool, follow the `create_transaction` example already written in `ARCHITECTURE.md` §4.2 — the pattern is: zod-validate → `db.insert()`/`update()`/`delete()` scoped by `ctx.workspaceId`+`ctx.userId` → `createAuditLog({ ..., metadata: { source: "ai_agent" } })`.

| File | Tools to add |
|---|---|
| `lib/ai/tools/notes.ts` | `create_note`, `update_note` |
| `lib/ai/tools/time.ts` | `log_time_entry` |
| `lib/ai/tools/fitness.ts` | `log_workout` |
| `lib/ai/tools/food.ts` | `log_meal` |
| `lib/ai/tools/fashion.ts` | `add_fashion_item` |
| `lib/ai/tools/finance.ts` | `create_transaction`, `create_budget` |

- [ ] Do **not** add `delete_*` tools in this phase. Deletions are the highest-risk action; add them last, in their own mini-phase, with an extra explicit re-confirmation ("this can't be undone — delete anyway?").

### 3.3 UI: confirm/cancel buttons
`components/ai/chat-page-client.tsx` and `floating-ai-widget.tsx`:
- [ ] When a response has `pendingAction`, render the `summary` with Yes/No buttons instead of plain text.
- [ ] "Yes" re-POSTs the same request with `confirm: { tool, args }` added.
- [ ] "No" appends a synthetic "user cancelled that action" turn so the model doesn't retry it.

### ✅ Acceptance criteria
- No mutating tool ever executes without an explicit prior "Yes" from the user — verify by trying to trick it in the same message ("log this expense, don't ask me to confirm") and confirming it still asks.
- Every write shows up in `auditLogs` with `metadata.source = "ai_agent"`.
- Cancelling ("No") does not write anything and the model doesn't loop back and try again unprompted.

---

## Phase 4 — Streaming UX (1–2 days)

- [ ] Convert `app/api/ai/chat/route.ts` to return a `ReadableStream` (SSE) instead of one JSON blob.
- [ ] Emit event types: `tool_call_started`, `tool_call_result`, `text_delta`, `pending_action`, `done`.
- [ ] `components/ai/chat-page-client.tsx`: consume the stream, render a small "🔧 Checked your transactions" trace line per `tool_call_started`/`tool_call_result` pair, append `text_delta`s to the current bubble.
- [ ] `components/ai/floating-ai-widget.tsx`: same, condensed.

### ✅ Acceptance criteria
- A multi-tool-hop answer (e.g. "compare my food spend this month vs last month") visibly shows each step instead of a long silent pause.

---

## Phase 5 — Observability & limits (1 day)

- [ ] Every agent turn writes to `aiInteractions` with `service: "agent_orchestrator"`, tool names used in `metadata.toolsUsed`, and standard token/latency fields (reuse `extractUsage()` already in `gemini-client.ts`).
- [ ] Add a per-user request counter (simple: a `count` + `windowStart` column, or Upstash Redis if you want it fast) and reject with a friendly message past e.g. 30 messages/hour.
- [ ] Cap `MAX_TOOL_HOPS` (already 4 in the sketch above) — log a warning if a conversation regularly hits the cap, it usually means a tool description is ambiguous.
- [ ] Optional: a simple `/admin/ai-activity` page querying `auditLogs` where `metadata->>'source' = 'ai_agent'`, for spot-checking what the AI has been doing.

### ✅ Acceptance criteria
- You can answer "what did the AI do for user X this week" from the DB alone, no log-diving required.

---

## Suggested overall sequencing

```
Phase 0 (flag)  →  Phase 1 (prove loop, 1 tool)  →  Phase 2 (all read tools)
     →  Phase 3 (writes: notes → time → fitness/food → fashion → finance)
     →  Phase 4 (streaming)  →  Phase 5 (observability)
```

Ship Phases 0–2 to production behind the flag first (low risk, read-only, immediately useful — "ask anything about your data" already beats the current snapshot chatbot). Only flip on Phase 3 once you've manually tested every mutating tool's confirmation flow.

## Rollback plan

Because everything is gated by `AI_AGENT_ENABLED` and the old `journalAssistant.chat()` path is left untouched through Phase 2, rollback at any point is just flipping the env var back to `false` — no data migration to undo, since Phase 3's writes go through the same audit-logged path as normal user writes and are indistinguishable in the schema (only `auditLogs.metadata.source` marks them as AI-originated, for your own review).
