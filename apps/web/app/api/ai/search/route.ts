/**
 * POST /api/ai/search
 *
 * Platform-wide AI search across all Aura360 modules.
 *
 * Supported request formats:
 * 1. Platform-wide server-side DB search (recommended):
 * {
 *   "query": "transactions for groceries",
 *   "module": "all" | "finance" | "notes" | "fitness" | "food" | "fashion" | "skincare" | "time" | "saved",
 *   "includeAiSummary": true,
 *   "model": "qwen/qwen3.8-27b"
 * }
 *
 * 2. Legacy client-side candidate re-ranking:
 * {
 *   "query": "search string",
 *   "candidates": [{ id, title, description?, module, tags? }]
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { smartSearch } from "@/lib/ai/services/smart-search"
import { executeUnifiedSearch, type SearchModule } from "@/lib/search/unified-search"
import type { AIModel } from "@/lib/ai/types"

const searchSchema = z.object({
  query: z.string().min(1).max(300),
  module: z
    .enum(["all", "notes", "finance", "fitness", "food", "fashion", "skincare", "time", "saved"])
    .optional(),
  includeAiSummary: z.boolean().optional(),
  model: z.string().optional(),
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
    .max(100)
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContext()

    const body = await request.json()
    const parsed = searchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { query, module, includeAiSummary, model, candidates } = parsed.data

    // If client supplied candidates explicitly (legacy path)
    if (candidates && candidates.length > 0) {
      const result = await smartSearch.rankResults(query, candidates)
      return NextResponse.json({
        results: result.data,
        usage: result.usage,
        source: result.source,
      })
    }

    // Platform-wide search across database tables
    const searchResponse = await executeUnifiedSearch(query, ctx, {
      module: module as SearchModule | "all",
      includeAiSummary: includeAiSummary ?? true,
      model: model as AIModel,
    })

    return NextResponse.json(searchResponse)
  } catch (error: any) {
    if (
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.message?.includes("NEXT_REDIRECT") ||
      error?.message?.includes("Unauthorized")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("[POST /api/ai/search] error:", error)
    return NextResponse.json(
      { error: "Failed to perform search across platform" },
      { status: 500 }
    )
  }
}
