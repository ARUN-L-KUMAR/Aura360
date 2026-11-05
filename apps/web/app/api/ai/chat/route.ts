/**
 * POST /api/ai/chat
 *
 * Conversational AI assistant powered by Gemini.
 *
 * Request body:
 * {
 *   "messages": [{ "role": "user"|"model", "content": "string" }],
 *   "context": "optional string snippet of user data"
 * }
 *
 * Response:
 * {
 *   "reply": "string",
 *   "usage": { promptTokens, completionTokens, totalTokens, latencyMs, model }
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { journalAssistant } from "@/lib/ai/services/journal-assistant"
import { getAIContext } from "@/app/api/ai/context/route"
import { runAgent } from "@/lib/ai/agent/orchestrator"
import { checkAiRateLimit } from "@/lib/ai/rate-limit"
import { db, aiInteractions } from "@/lib/db"

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(20),
  context: z.string().max(8000).optional(),
  model: z.string().optional(),
  stream: z.boolean().optional(),
  confirm: z
    .object({
      tool: z.string(),
      args: z.record(z.any()),
    })
    .optional(),
  pageContext: z
    .object({
      pathname: z.string().optional(),
      module: z.string().optional(),
      pageTitle: z.string().optional(),
      activeTab: z.string().optional(),
      activeModal: z.string().nullish(),
      activeItem: z.record(z.any()).nullish(),
      visibleSummary: z.string().optional(),
    })
    .optional(),
})

async function logAiInteraction(params: {
  workspaceId: string
  userId: string
  service: string
  model: string
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; latencyMs?: number }
  traceLength?: number
  success: boolean
  errorMessage?: string
}) {
  try {
    await db.insert(aiInteractions).values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      service: params.service,
      model: params.model,
      promptTokens: params.usage?.promptTokens ?? 0,
      completionTokens: params.usage?.completionTokens ?? 0,
      totalTokens: params.usage?.totalTokens ?? 0,
      latencyMs: params.usage?.latencyMs,
      success: params.success,
      errorMessage: params.errorMessage,
      entityType: params.traceLength ? "agent_tool_call" : undefined,
    })
  } catch (err) {
    console.warn("[POST /api/ai/chat] Failed to log AI interaction:", err)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const { workspaceId, userId } = await getWorkspaceContext()

    // Rate limit check
    const rateLimit = await checkAiRateLimit(userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.reason ?? "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": rateLimit.resetAt.toISOString() } }
      )
    }

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const isStream =
      parsed.data.stream === true ||
      request.headers.get("accept")?.includes("text/event-stream")

    // Agentic AI Mode (Feature Flagged)
    if (process.env.AI_AGENT_ENABLED === "true") {
      if (isStream) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const agentResult = await runAgent(
                { workspaceId, userId },
                parsed.data.messages,
                {
                  model: parsed.data.model as any,
                  confirm: parsed.data.confirm,
                  pageContext: parsed.data.pageContext,
                  onEvent: (event) => {
                    const ssePayload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
                    controller.enqueue(encoder.encode(ssePayload))
                  },
                }
              )

              if (agentResult) {
                await logAiInteraction({
                  workspaceId,
                  userId,
                  service: "agent_orchestrator",
                  model: agentResult.usage?.model ?? (parsed.data.model ?? "gemini-3.6-flash"),
                  usage: agentResult.usage,
                  traceLength: agentResult.trace?.length,
                  success: true,
                })
              }
            } catch (err: any) {
              console.error("[POST /api/ai/chat stream error]:", err)
              await logAiInteraction({
                workspaceId,
                userId,
                service: "agent_orchestrator",
                model: parsed.data.model ?? "gemini-3.6-flash",
                success: false,
                errorMessage: err?.message || "Internal agent error",
              })
              const errPayload = `event: error\ndata: ${JSON.stringify({ message: err?.message || "Internal agent error" })}\n\n`
              controller.enqueue(encoder.encode(errPayload))
            } finally {
              controller.close()
            }
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        })
      }

      const agentResult = await runAgent(
        { workspaceId, userId },
        parsed.data.messages,
        {
          model: parsed.data.model as any,
          confirm: parsed.data.confirm,
          pageContext: parsed.data.pageContext,
        }
      )

      await logAiInteraction({
        workspaceId,
        userId,
        service: "agent_orchestrator",
        model: agentResult.usage?.model ?? (parsed.data.model ?? "gemini-3.6-flash"),
        usage: agentResult.usage,
        traceLength: agentResult.trace?.length,
        success: true,
      })

      return NextResponse.json({
        reply: agentResult.reply,
        trace: agentResult.trace,
        pendingAction: agentResult.pendingAction,
        usage: agentResult.usage,
        source: agentResult.source,
      })
    }

    // Fallback: Context-stuffed chatbot
    let context = parsed.data.context
    if (!context) {
      try {
        const serverContext = await getAIContext(workspaceId, userId)
        context = serverContext.context
      } catch (ctxErr) {
        console.warn("[POST /api/ai/chat] Failed to load server context:", ctxErr)
      }
    }

    const result = await journalAssistant.chat({
      messages: parsed.data.messages,
      context,
      model: parsed.data.model as any,
    })

    await logAiInteraction({
      workspaceId,
      userId,
      service: "journal_assistant",
      model: result.usage?.model ?? (parsed.data.model ?? "gemini-3.6-flash"),
      usage: result.usage,
      success: true,
    })

    return NextResponse.json({
      reply: result.data,
      usage: result.usage,
      source: result.source,
    })
  } catch (error) {
    console.error("[POST /api/ai/chat] error:", error)

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const message = error instanceof Error ? error.message : "Failed to get AI response"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
