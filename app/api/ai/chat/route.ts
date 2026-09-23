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
})

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const { workspaceId, userId } = await getWorkspaceContext()

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // If context is omitted (e.g. from the floating chat widget),
    // fetch live workspace context directly on the server
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
