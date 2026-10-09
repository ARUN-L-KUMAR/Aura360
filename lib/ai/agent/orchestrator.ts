/**
 * Agent Orchestrator — multi-turn tool calling loop for Aura360
 */

import { geminiClient } from "@/lib/ai/gemini-client"
import { openaiGroqClient } from "@/lib/ai/openai-groq-client"
import { toolRegistry, getToolDeclarations } from "@/lib/ai/tools"
import { FAST_MODEL, getProviderForModel } from "@/lib/ai/types"
import type { AIModel, AIUsageMetadata, ChatMessage } from "@/lib/ai/types"
import type { WorkspaceContext } from "@/lib/db"
import { buildSummary, type PendingAction } from "./confirmation"

const MAX_TOOL_HOPS = 4

const AGENT_SYSTEM_PROMPT = `
You are Aura, an intelligent and efficient personal assistant for Aura360.

Core Behavior & Response Rules:
1. BE DIRECT & CONCISE: Answer questions immediately. Never include preambles, introductory filler, or conversational waffle (e.g., do NOT say "Let's check that", "Here is your breakdown", "I have found the following").
2. TOOL USAGE:
   - You have access to tools that query the user's live database across all personal modules:
     * Finance: transactions, category budgets, savings goals, account balances
     * Fitness: workout and exercise logs
     * Food: meals, food, and nutrition logs
     * Notes: personal notes, ideas, and journals
     * Fashion: wardrobe items, wishlist items, and the user's fit profile (measurements, sizes, skin tone, hair, favorite/avoided colors)
     * Skincare: grooming routines and products
     * Time: time tracking logs and activity durations
     * Saved: bookmarks, articles, recipes, and videos
   - Always call the appropriate tool when asked about user data instead of guessing or stating that you don't have access.
   - PRODUCT LINKS: when the user pastes a shopping link (Amazon, Flipkart, Myntra, Ajio, Meesho), call get_product_from_link first and never guess product details from the link text. If they asked to add or save it, then call add_fashion_item_from_link with status "wishlist" (or "wardrobe" only if they say they own or bought it). If the link cannot be read, say so in one line and ask for the name, category and price, then use add_fashion_item and pass the link as buyingLink. If they only paste a link with no request, give the key details (name, price, sizes) and ask whether to add it to the wardrobe or wishlist. After adding, mention in one line if their saved size is not available.
   - For outfit, color, size or fit recommendations, call get_fashion_profile together with get_wardrobe and personalise the answer: flatter their skin tone and undertone, favor their favorite colors, never suggest colors they avoid, respect their preferred fit and use their measurements for proportions. If they have no profile yet, give the advice anyway and mention once that they can add it under Fashion > My Fit.
   - Use ISO date format (YYYY-MM-DD) for tool date parameters.
3. NEVER OUTPUT INTERNAL REASONING OR DATE MATH:
   - Do NOT explain your calendar calculations or timeline deductions.
   - Use dates silently to look up records and provide the answer directly.
4. CLEAN STRUCTURED OUTPUT:
   - Jump straight into facts, dates, and clean bullet points without pleasantries or preambles.
   - Keep bullet points tight and readable.
5. NO UNWANTED DISCLAIMERS: Do not add disclaimers or repetitive advice unless the user specifically asked for advice.
6. NO ROUTER PATHS OR URLS IN REPLIES: Never output technical router paths or URLs (such as /dashboard, /dashboard/finance, /dashboard/notes, etc.). Always refer to pages and sections by their natural names (e.g. "Finance page", "Notes", "Dashboard").
7. GENERATIVE INTERACTIVE UI WIDGETS:
   Whenever the user asks to plan, design, or generate a workout, meal/nutrition plan, budget allocation, or outfit/capsule lookbook, ALWAYS output an interactive generative widget block alongside your advice so the user can interactively log, customize, or launch it directly in the app. Use the exact code fence format:

   - For Workouts:
   \`\`\`widget:workout
   {
     "widget": "workout",
     "title": "Hypertrophy Push Session",
     "duration": "45 mins",
     "difficulty": "Intermediate",
     "targetMuscles": ["Chest", "Shoulders", "Triceps"],
     "exercises": [
       { "name": "Incline Dumbbell Press", "sets": 3, "reps": "8-10", "weight": "26kg" },
       { "name": "Overhead Shoulder Press", "sets": 3, "reps": "10-12", "weight": "20kg" },
       { "name": "Cable Tricep Pushdowns", "sets": 3, "reps": "12-15", "weight": "25kg" }
     ]
   }
   \`\`\`

   - For Meals / Nutrition:
   \`\`\`widget:meal
   {
     "widget": "meal",
     "name": "Grilled Lemon Herb Salmon & Quinoa",
     "calories": 580,
     "macros": { "protein": 42, "carbs": 48, "fats": 16 },
     "time": "20 mins",
     "ingredients": ["200g Wild Salmon Fillet", "1 cup Cooked Quinoa", "Steamed Asparagus", "Olive Oil & Lemon"]
   }
   \`\`\`

   - For Financial Budgets:
   \`\`\`widget:finance
   {
     "widget": "finance",
     "title": "Balanced Monthly Allocation",
     "totalIncome": 4500,
     "currency": "$",
     "categories": [
       { "name": "Needs (Rent & Groceries)", "percentage": 50, "description": "Fixed essential expenses" },
       { "name": "Wants (Dining & Lifestyle)", "percentage": 30, "description": "Discretionary spending" },
       { "name": "Savings & Investments", "percentage": 20, "description": "Emergency fund & index investing" }
     ],
     "advice": "Prioritize establishing a 3-month emergency safety cushion."
   }
   \`\`\`

   - For Outfits / Style:
   \`\`\`widget:fashion
   {
     "widget": "fashion",
     "title": "Modern Minimalist Layering",
     "vibe": "Elevated Smart Casual",
     "weatherMatch": "Mild & Crisp 18°C",
     "palette": [
       { "name": "Oatmeal", "hex": "#E6DFD5" },
       { "name": "Charcoal", "hex": "#2D3748" },
       { "name": "Off-White", "hex": "#F7FAFC" }
     ],
     "items": [
       { "category": "Top", "name": "Heavyweight Boxy Tee", "color": "Oatmeal Beige", "colorHex": "#E6DFD5" },
       { "category": "Outerwear", "name": "Wool Overshirt", "color": "Charcoal Slate", "colorHex": "#2D3748" },
       { "category": "Bottom", "name": "Pleated Relaxed Trousers", "color": "Dark Olive", "colorHex": "#3B413C" },
       { "category": "Footwear", "name": "Retro Court Lows", "color": "Off-White", "colorHex": "#F7FAFC" }
     ],
     "stylingTip": "Keep silhouettes relaxed on top with clean drapes below for an effortless contemporary look."
   }
   \`\`\`
`.trim()

export type AgentStreamEvent =
  | { type: "tool_call_started"; data: { tool: string; args: unknown } }
  | { type: "tool_call_result"; data: { tool: string; result: unknown } }
  | { type: "pending_action"; data: PendingAction }
  | { type: "text_delta"; data: { delta: string } }
  | { type: "done"; data: AgentRunResult }
  | { type: "error"; data: { message: string } }

export interface AgentRunResult {
  reply: string
  trace: { tool: string; args: unknown }[]
  pendingAction?: PendingAction
  usage: AIUsageMetadata
  source: "agent"
}

export interface AgentRunOptions {
  model?: AIModel
  systemPrompt?: string
  pageContext?: {
    pathname?: string
    module?: string
    pageTitle?: string
    activeTab?: string
    activeModal?: string | null
    activeItem?: Record<string, any> | null
    visibleSummary?: string
  }
  confirm?: {
    tool: string
    args: Record<string, any>
  }
  onEvent?: (event: AgentStreamEvent) => void | Promise<void>
}

function buildContextPrompt(pageContext?: AgentRunOptions["pageContext"]): string {
  if (!pageContext) return ""

  const lines = ["[CURRENT USER VIEWPORT CONTEXT]"]
  if (pageContext.pageTitle || pageContext.module) {
    lines.push(`- Active Page: ${pageContext.pageTitle || pageContext.module}`)
  }
  if (pageContext.activeTab) {
    lines.push(`- Active Tab / View: "${pageContext.activeTab}"`)
  }
  if (pageContext.activeModal) {
    lines.push(`- Active Open Modal / Action Dialog: "${pageContext.activeModal}" (The user has this dialog open right now)`)
  }
  if (pageContext.activeItem) {
    lines.push(`- Open Item / Active Data Content: ${JSON.stringify(pageContext.activeItem)}`)
  }
  if (pageContext.visibleSummary) {
    lines.push(`- Page Highlights: ${pageContext.visibleSummary}`)
  }
  lines.push(
    `- Context Awareness Rule: You are fully aware of what the user is looking at. When the user asks "summarize this page", "what am I looking at?", "what's on this tab?", "help me fill this", or refers to "this", resolve their query using this viewport context first before calling external query tools.`
  )
  lines.push(
    `- NEVER OUTPUT ROUTER PATHS OR URLS: Do NOT mention URLs or paths like "/dashboard", "/dashboard/finance", etc. in your replies. Refer to pages only by their natural readable names (e.g., "Finance page", "Dashboard", "Notes").`
  )

  return "\n\n" + lines.join("\n")
}

async function streamDeltas(
  text: string,
  onEvent?: (event: AgentStreamEvent) => void | Promise<void>
) {
  if (!onEvent) return
  // Break into chunks of 3-5 words for progressive typing effect
  const words = text.split(/(\s+)/)
  let buffer = ""
  for (let i = 0; i < words.length; i++) {
    buffer += words[i]
    if (i % 6 === 5 || i === words.length - 1) {
      await onEvent({ type: "text_delta", data: { delta: buffer } })
      buffer = ""
      await new Promise((r) => setTimeout(r, 12))
    }
  }
}

export async function runAgent(
  ctx: WorkspaceContext,
  messages: ChatMessage[],
  options: AgentRunOptions = {}
): Promise<AgentRunResult> {
  const startAt = Date.now()
  const targetModel: AIModel = options.model ?? FAST_MODEL
  const provider = getProviderForModel(targetModel)
  const tools = getToolDeclarations()

  const now = new Date()
  const currentDateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const dateContext = `\n\n[SYSTEM METADATA - DO NOT ECHO OR EXPLAIN TO USER]\nToday's date is ${currentDateStr}. Use this silently for relative date calculations (e.g. today, yesterday, this month, last week).`
  const contextPrompt = buildContextPrompt(options.pageContext)
  const systemPrompt = (options.systemPrompt ?? AGENT_SYSTEM_PROMPT) + dateContext + contextPrompt

  // ─── If this is a confirmed execution from UI ───
  if (options.confirm) {
    const { tool: toolName, args } = options.confirm
    const tool = toolRegistry[toolName]
    if (!tool) {
      throw new Error(`Unknown tool for confirmation: ${toolName}`)
    }

    await options.onEvent?.({ type: "tool_call_started", data: { tool: toolName, args } })
    const parsedArgs = tool.parameters.parse(args)
    const toolResult = await tool.handler(parsedArgs, ctx)
    await options.onEvent?.({ type: "tool_call_result", data: { tool: toolName, result: toolResult } })
    const trace = [{ tool: toolName, args: parsedArgs }]

    const confirmMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: `The user confirmed the action. Tool "${toolName}" was successfully executed with output: ${JSON.stringify(toolResult)}. Provide a concise confirmation to the user.`,
      },
    ]

    let genRes: { text: string; usage: any }
    try {
      genRes =
        provider === "gemini"
          ? await geminiClient.generateText(
              { messages: confirmMessages, systemPrompt },
              { model: targetModel, config: { temperature: 0.2 } }
            )
          : await openaiGroqClient.generateText(
              { messages: confirmMessages, systemPrompt },
              { model: targetModel, config: { temperature: 0.2 } }
            )
    } catch (err: any) {
      if (provider === "groq") {
        console.warn(`[AgentOrchestrator] Groq quota limit hit. Auto-switching to Gemini 3.6 Flash fallback...`)
        genRes = await geminiClient.generateText(
          { messages: confirmMessages, systemPrompt },
          { model: "gemini-3.6-flash", config: { temperature: 0.2 } }
        )
      } else {
        throw err
      }
    }

    const finalResult: AgentRunResult = {
      reply: genRes.text,
      trace,
      usage: genRes.usage,
      source: "agent",
    }

    await streamDeltas(genRes.text, options.onEvent)
    await options.onEvent?.({ type: "done", data: finalResult })

    return finalResult
  }

  let convo: ChatMessage[] = [...messages]
  const trace: { tool: string; args: unknown }[] = []

  let totalPromptTokens = 0
  let totalCompletionTokens = 0

  for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
    let result: any
    try {
      result =
        provider === "gemini"
          ? await geminiClient.generateWithTools(
              {
                messages: convo,
                systemPrompt,
                tools,
              },
              {
                model: targetModel,
                config: {
                  temperature: 0.2,
                  timeoutMs: 30_000,
                },
              }
            )
          : await openaiGroqClient.generateWithTools(
              {
                messages: convo,
                systemPrompt,
                tools,
              },
              {
                model: targetModel,
                config: {
                  temperature: 0.2,
                },
              }
            )
    } catch (err: any) {
      if (provider === "groq") {
        console.warn(`[AgentOrchestrator] Groq quota limit hit (${err?.message}). Auto-switching to Gemini 3.6 Flash fallback...`)
        result = await geminiClient.generateWithTools(
          {
            messages: convo,
            systemPrompt,
            tools,
          },
          {
            model: "gemini-3.6-flash",
            config: {
              temperature: 0.2,
              timeoutMs: 30_000,
            },
          }
        )
      } else {
        throw err
      }
    }

    totalPromptTokens += result.usage.promptTokens
    totalCompletionTokens += result.usage.completionTokens

    if (result.functionCall) {
      const { name, args } = result.functionCall
      const tool = toolRegistry[name]

      if (!tool) {
        console.warn(`[AgentOrchestrator] Unknown tool requested: ${name}`)
        convo = [
          ...convo,
          { role: "model", parts: result.rawParts, functionCall: result.functionCall },
          {
            role: "function",
            parts: [
              {
                functionResponse: {
                  name,
                  response: { error: `Tool "${name}" is not supported.` },
                },
              },
            ],
            functionResponse: {
              name,
              response: { error: `Tool "${name}" is not supported.` },
            },
          },
        ]
        continue
      }

      const parseResult = tool.parameters.safeParse(args)
      if (!parseResult.success) {
        console.warn(`[AgentOrchestrator] Invalid arguments for ${name}:`, parseResult.error)
        convo = [
          ...convo,
          { role: "model", parts: result.rawParts, functionCall: result.functionCall },
          {
            role: "function",
            parts: [
              {
                functionResponse: {
                  name,
                  response: {
                    error: "Invalid arguments provided for tool",
                    details: parseResult.error.flatten(),
                  },
                },
              },
            ],
            functionResponse: {
              name,
              response: {
                error: "Invalid arguments provided for tool",
                details: parseResult.error.flatten(),
              },
            },
          },
        ]
        continue
      }

      const parsedArgs = parseResult.data
      await options.onEvent?.({ type: "tool_call_started", data: { tool: name, args: parsedArgs } })

      // ─── Confirmation Gate ───
      if (tool.mutates) {
        const summary = buildSummary(name, parsedArgs)
        trace.push({ tool: name, args: parsedArgs })
        const pendingAction = {
          tool: name,
          args: parsedArgs,
          summary,
        }
        const confirmReply = `I can do that for you. Please confirm: **${summary}**`

        const finalResult: AgentRunResult = {
          reply: confirmReply,
          pendingAction,
          trace,
          usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
            totalTokens: totalPromptTokens + totalCompletionTokens,
            latencyMs: Date.now() - startAt,
            model: targetModel,
          },
          source: "agent",
        }

        await options.onEvent?.({ type: "pending_action", data: pendingAction })
        await streamDeltas(confirmReply, options.onEvent)
        await options.onEvent?.({ type: "done", data: finalResult })

        return finalResult
      }
      trace.push({ tool: name, args: parsedArgs })

      try {
        const toolOutput = await tool.handler(parsedArgs, ctx)
        await options.onEvent?.({ type: "tool_call_result", data: { tool: name, result: toolOutput } })

        convo = [
          ...convo,
          { role: "model", parts: result.rawParts, functionCall: result.functionCall },
          {
            role: "function",
            parts: [
              {
                functionResponse: {
                  name,
                  response: {
                    output: toolOutput,
                  },
                },
              },
            ],
            functionResponse: {
              name,
              response: {
                output: toolOutput,
              },
            },
          },
        ]
      } catch (handlerErr: any) {
        console.error(`[AgentOrchestrator] Error executing ${name}:`, handlerErr)
        await options.onEvent?.({
          type: "tool_call_result",
          data: {
            tool: name,
            result: { error: `Failed to execute tool: ${handlerErr?.message ?? "Unknown error"}` },
          },
        })

        convo = [
          ...convo,
          { role: "model", parts: result.rawParts, functionCall: result.functionCall },
          {
            role: "function",
            parts: [
              {
                functionResponse: {
                  name,
                  response: {
                    error: `Failed to execute tool: ${handlerErr?.message ?? "Unknown error"}`,
                  },
                },
              },
            ],
            functionResponse: {
              name,
              response: {
                error: `Failed to execute tool: ${handlerErr?.message ?? "Unknown error"}`,
              },
            },
          },
        ]
      }

      continue
    }

    if (result.text) {
      const finalResult: AgentRunResult = {
        reply: result.text,
        trace,
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens,
          latencyMs: Date.now() - startAt,
          model: targetModel,
        },
        source: "agent",
      }

      await streamDeltas(result.text, options.onEvent)
      await options.onEvent?.({ type: "done", data: finalResult })

      return finalResult
    }
  }

  const fallbackReply =
    "I retrieved the information but reached the maximum tool reasoning steps. Please rephrase or narrow your request."
  const fallbackResult: AgentRunResult = {
    reply: fallbackReply,
    trace,
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      latencyMs: Date.now() - startAt,
      model: targetModel,
    },
    source: "agent",
  }

  await streamDeltas(fallbackReply, options.onEvent)
  await options.onEvent?.({ type: "done", data: fallbackResult })

  return fallbackResult
}
