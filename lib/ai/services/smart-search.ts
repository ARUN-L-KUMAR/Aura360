/**
 * Smart Search — AI-powered semantic ranking across Aura360 modules
 *
 * Takes a natural-language query and a list of candidate items,
 * then returns them reordered by relevance with a confidence score.
 */

import { geminiClient } from "../gemini-client"
import { FAST_MODEL } from "../types"
import type { AIResponse, RankedResult, SearchCandidate } from "../types"

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(query: string, candidates: SearchCandidate[]): string {
  const candidateList = candidates
    .map((c, i) => `${i}: id="${c.id}" title="${c.title}" module="${c.module}" desc="${c.description ?? ""}"`)
    .join("\n")

  return `
You are a semantic search engine for a personal productivity app called Aura360.

The user searched for: "${query}"

Below are candidate items. Rank them by relevance to the query and return a JSON array.

Each element must have exactly these fields:
{
  "id": "<original candidate id>",
  "score": <0.0 to 1.0 relevance score>,
  "reason": "<one sentence explaining why this is relevant>"
}

Rules:
- Only include candidates with score > 0.1
- Sort descending by score
- Return ONLY the JSON array, no markdown, no explanation

Candidates:
${candidateList}
`.trim()
}

// ─── Fallback: simple keyword scoring ────────────────────────────────────────

function keywordRank(query: string, candidates: SearchCandidate[]): RankedResult[] {
  const words = query.toLowerCase().split(/\s+/)
  return candidates
    .map((c) => {
      const haystack = `${c.title} ${c.description ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase()
      const matches = words.filter((w) => haystack.includes(w)).length
      const score = matches / words.length
      return { ...c, score, reason: undefined }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
}

// ─── Service class ────────────────────────────────────────────────────────────

class SmartSearch {
  /**
   * Rank search candidates by relevance to a natural-language query.
   * Falls back to keyword matching if AI is unavailable.
   */
  async rankResults(
    query: string,
    candidates: SearchCandidate[]
  ): Promise<AIResponse<RankedResult[]>> {
    const startAt = Date.now()

    if (candidates.length === 0) {
      return {
        data: [],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: 0, model: FAST_MODEL },
        service: "smart_search",
        source: "fallback",
      }
    }

    if (!geminiClient.isAvailable()) {
      return {
        data: keywordRank(query, candidates),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: Date.now() - startAt, model: FAST_MODEL },
        service: "smart_search",
        source: "fallback",
      }
    }

    try {
      // Limit to 50 candidates to keep prompt size reasonable
      const batch = candidates.slice(0, 50)
      const candidateMap = new Map(batch.map((c) => [c.id, c]))

      const { data: ranked, usage } = await geminiClient.generateJson<
        Array<{ id: string; score: number; reason?: string }>
      >(
        { prompt: buildPrompt(query, batch) },
        { model: FAST_MODEL, config: { temperature: 0, maxOutputTokens: 1024, timeoutMs: 10_000 } }
      )

      const results: RankedResult[] = ranked
        .filter((r) => candidateMap.has(r.id))
        .map((r) => ({
          ...candidateMap.get(r.id)!,
          score: typeof r.score === "number" ? Math.max(0, Math.min(1, r.score)) : 0,
          reason: r.reason,
        }))
        .sort((a, b) => b.score - a.score)

      return { data: results, usage, service: "smart_search", source: "ai" }
    } catch (err) {
      console.warn("[ai/smart-search] Gemini failed, falling back to keyword ranking:", err)
      return {
        data: keywordRank(query, candidates),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: Date.now() - startAt, model: FAST_MODEL },
        service: "smart_search",
        source: "fallback",
      }
    }
  }
}

export const smartSearch = new SmartSearch()
