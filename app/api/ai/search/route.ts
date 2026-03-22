/**
 * POST /api/ai/search
 *
 * AI-powered semantic search across Aura360 modules.
 *
 * Request body:
 * {
 *   "query": "natural language search string",
 *   "candidates": [{ id, title, description?, module, tags? }]
 * }
 *
 * Response:
 * {
 *   "results": [{ id, title, description?, module, tags?, score, reason? }],
 *   "usage": { ... },
 *   "source": "ai" | "fallback"
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { smartSearch } from "@/lib/ai/services/smart-search"

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  candidates: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullish(),
        module: z.string(),
        tags: z.array(z.string()).optional(),
      })
    )
    .max(100),
})

export async function POST(request: NextRequest) {
  try {
    await getWorkspaceContext()

    const body = await request.json()
    const parsed = searchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await smartSearch.rankResults(parsed.data.query, parsed.data.candidates)

    return NextResponse.json({
      results: result.data,
      usage: result.usage,
      source: result.source,
    })
  } catch (error) {
    console.error("[POST /api/ai/search] error:", error)

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(
      { error: "Failed to perform AI search" },
      { status: 500 }
    )
  }
}
