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
  context: z.string().max(3000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    await getWorkspaceContext()

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await journalAssistant.chat({
      messages: parsed.data.messages,
      context: parsed.data.context,
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

    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 }
    )
  }
}
