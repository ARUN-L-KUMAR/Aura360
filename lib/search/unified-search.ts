/**
 * Unified Platform-Wide Search Engine for Aura360
 *
 * Searches across:
 * - Notes & Journals (title, content, category)
 * - Finance Transactions (description, category, type)
 * - Fitness Logs (workoutType, type, notes)
 * - Food Logs (name, mealType, notes)
 * - Fashion & Wardrobe (name, category, brand, notes)
 * - Skincare Products (name, bodyPart, brand, notes)
 * - Time Tracking (activity, category)
 * - Saved Items & Bookmarks (title, description, url)
 */

import { 
  db, 
  notes, 
  transactions, 
  fitness, 
  food, 
  fashionItems, 
  skincare, 
  timeLogs, 
  savedItems,
  type WorkspaceContext 
} from "@/lib/db"
import { and, eq, ilike, or, desc } from "drizzle-orm"
import { openaiGroqClient } from "@/lib/ai/openai-groq-client"
import { geminiClient } from "@/lib/ai/gemini-client"
import { FAST_MODEL, type AIModel } from "@/lib/ai/types"

export type SearchModule =
  | "notes"
  | "finance"
  | "fitness"
  | "food"
  | "fashion"
  | "skincare"
  | "time"
  | "saved"

export interface PlatformSearchResult {
  id: string
  module: SearchModule
  moduleName: string
  title: string
  subtitle?: string
  snippet?: string
  date?: string
  href: string
  badge?: string
  score?: number
  reason?: string
}

export interface UnifiedSearchResponse {
  query: string
  results: PlatformSearchResult[]
  aiSummary?: string
  totalMatches: number
  source: "ai" | "keyword"
  latencyMs: number
}

/**
 * Searches the database across all active workspace modules.
 */
export async function queryDatabaseAcrossModules(
  query: string,
  ctx: WorkspaceContext,
  moduleFilter?: SearchModule | "all",
  perModuleLimit: number = 8
): Promise<PlatformSearchResult[]> {
  const searchTerm = query.trim()
  const filter = moduleFilter || "all"
  const ilikePattern = `%${searchTerm}%`

  const tasks: Promise<PlatformSearchResult[]>[] = []

  // 1. Notes
  if (filter === "all" || filter === "notes") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: notes.id,
              title: notes.title,
              content: notes.content,
              category: notes.category,
              createdAt: notes.createdAt,
            })
            .from(notes)
            .where(
              and(
                eq(notes.workspaceId, ctx.workspaceId),
                eq(notes.userId, ctx.userId),
                eq(notes.isArchived, false),
                searchTerm
                  ? or(
                      ilike(notes.title, ilikePattern),
                      ilike(notes.content, ilikePattern),
                      ilike(notes.category, ilikePattern)
                    )
                  : undefined
              )
            )
            .orderBy(desc(notes.createdAt))
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "notes" as const,
            moduleName: "Notes",
            title: r.title || "Untitled Note",
            subtitle: r.category || "General",
            snippet: r.content?.slice(0, 120),
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : undefined,
            href: `/dashboard/notes`,
            badge: r.category || undefined,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  // 2. Finance Transactions
  if (filter === "all" || filter === "finance") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: transactions.id,
              description: transactions.description,
              amount: transactions.amount,
              type: transactions.type,
              category: transactions.category,
              date: transactions.date,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.workspaceId, ctx.workspaceId),
                eq(transactions.userId, ctx.userId),
                searchTerm
                  ? or(
                      ilike(transactions.description, ilikePattern),
                      ilike(transactions.category, ilikePattern)
                    )
                  : undefined
              )
            )
            .orderBy(desc(transactions.date))
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "finance" as const,
            moduleName: "Finance",
            title: r.description || "Transaction",
            subtitle: `${r.type.toUpperCase()} • ₹${Number(r.amount).toLocaleString("en-IN")}`,
            snippet: `Category: ${r.category}`,
            date: r.date,
            href: `/dashboard/finance`,
            badge: r.type,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  // 3. Fitness Logs
  if (filter === "all" || filter === "fitness") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: fitness.id,
              type: fitness.type,
              workoutType: fitness.workoutType,
              duration: fitness.duration,
              notes: fitness.notes,
              date: fitness.date,
            })
            .from(fitness)
            .where(
              and(
                eq(fitness.workspaceId, ctx.workspaceId),
                eq(fitness.userId, ctx.userId),
                searchTerm
                  ? or(
                      ilike(fitness.workoutType, ilikePattern),
                      ilike(fitness.type, ilikePattern),
                      ilike(fitness.notes, ilikePattern)
                    )
                  : undefined
              )
            )
            .orderBy(desc(fitness.date))
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "fitness" as const,
            moduleName: "Fitness",
            title: r.workoutType || r.type || "Workout",
            subtitle: `${r.duration ? `${r.duration} mins` : "Logged workout"}`,
            snippet: r.notes || undefined,
            date: r.date,
            href: `/dashboard/fitness`,
            badge: r.type,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  // 4. Food Logs
  if (filter === "all" || filter === "food") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: food.id,
              name: food.foodName,
              mealType: food.mealType,
              calories: food.calories,
              notes: food.notes,
              date: food.date,
            })
            .from(food)
            .where(
              and(
                eq(food.workspaceId, ctx.workspaceId),
                eq(food.userId, ctx.userId),
                searchTerm
                  ? or(
                      ilike(food.foodName, ilikePattern),
                      ilike(food.notes, ilikePattern)
                    )
                  : undefined
              )
            )
            .orderBy(desc(food.date))
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "food" as const,
            moduleName: "Food",
            title: r.name,
            subtitle: `${r.mealType.toUpperCase()} ${r.calories ? `• ${r.calories} kcal` : ""}`,
            snippet: r.notes || undefined,
            date: r.date,
            href: `/dashboard/food`,
            badge: r.mealType,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  // 5. Fashion Wardrobe
  if (filter === "all" || filter === "fashion") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: fashionItems.id,
              name: fashionItems.name,
              category: fashionItems.category,
              brand: fashionItems.brand,
              color: fashionItems.color,
              notes: fashionItems.notes,
            })
            .from(fashionItems)
            .where(
              and(
                eq(fashionItems.workspaceId, ctx.workspaceId),
                eq(fashionItems.userId, ctx.userId),
                searchTerm
                  ? or(
                      ilike(fashionItems.name, ilikePattern),
                      ilike(fashionItems.category, ilikePattern),
                      ilike(fashionItems.brand, ilikePattern),
                      ilike(fashionItems.color, ilikePattern),
                      ilike(fashionItems.notes, ilikePattern)
                    )
                  : undefined
              )
            )
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "fashion" as const,
            moduleName: "Fashion",
            title: r.name,
            subtitle: `${r.category}${r.brand ? ` • ${r.brand}` : ""}${r.color ? ` (${r.color})` : ""}`,
            snippet: r.notes || undefined,
            href: `/dashboard/fashion`,
            badge: r.category,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  // 6. Skincare Routine
  if (filter === "all" || filter === "skincare") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: skincare.id,
              name: skincare.productName,
              bodyPart: skincare.bodyPart,
              brand: skincare.brand,
              status: skincare.status,
              notes: skincare.notes,
            })
            .from(skincare)
            .where(
              and(
                eq(skincare.workspaceId, ctx.workspaceId),
                eq(skincare.userId, ctx.userId),
                searchTerm
                  ? or(
                      ilike(skincare.productName, ilikePattern),
                      ilike(skincare.brand, ilikePattern),
                      ilike(skincare.notes, ilikePattern)
                    )
                  : undefined
              )
            )
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "skincare" as const,
            moduleName: "Skincare",
            title: r.name,
            subtitle: `${r.bodyPart.toUpperCase()}${r.brand ? ` • ${r.brand}` : ""} (${r.status})`,
            snippet: r.notes || undefined,
            href: `/dashboard/skincare`,
            badge: r.bodyPart,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  // 7. Time Logs
  if (filter === "all" || filter === "time") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: timeLogs.id,
              activity: timeLogs.activity,
              category: timeLogs.category,
              duration: timeLogs.duration,
              date: timeLogs.date,
            })
            .from(timeLogs)
            .where(
              and(
                eq(timeLogs.workspaceId, ctx.workspaceId),
                eq(timeLogs.userId, ctx.userId),
                searchTerm
                  ? or(
                      ilike(timeLogs.activity, ilikePattern),
                      ilike(timeLogs.category, ilikePattern)
                    )
                  : undefined
              )
            )
            .orderBy(desc(timeLogs.date))
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "time" as const,
            moduleName: "Time",
            title: r.activity,
            subtitle: `${r.category || "General"} • ${r.duration}m`,
            date: r.date,
            href: `/dashboard/time`,
            badge: r.category || undefined,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  // 8. Saved Items
  if (filter === "all" || filter === "saved") {
    tasks.push(
      (async () => {
        try {
          const rows = await db
            .select({
              id: savedItems.id,
              title: savedItems.title,
              description: savedItems.description,
              url: savedItems.url,
              type: savedItems.type,
              createdAt: savedItems.createdAt,
            })
            .from(savedItems)
            .where(
              and(
                eq(savedItems.workspaceId, ctx.workspaceId),
                eq(savedItems.userId, ctx.userId),
                searchTerm
                  ? or(
                      ilike(savedItems.title, ilikePattern),
                      ilike(savedItems.description, ilikePattern),
                      ilike(savedItems.url, ilikePattern)
                    )
                  : undefined
              )
            )
            .orderBy(desc(savedItems.createdAt))
            .limit(perModuleLimit)

          return rows.map((r) => ({
            id: r.id,
            module: "saved" as const,
            moduleName: "Saved",
            title: r.title || "Saved Link",
            subtitle: r.type ? r.type.toUpperCase() : "Bookmark",
            snippet: r.description || r.url || undefined,
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : undefined,
            href: `/dashboard/saved`,
            badge: r.type || undefined,
          }))
        } catch {
          return []
        }
      })()
    )
  }

  const resultsNested = await Promise.allSettled(tasks)
  const flattened: PlatformSearchResult[] = []

  for (const res of resultsNested) {
    if (res.status === "fulfilled") {
      flattened.push(...res.value)
    }
  }

  return flattened
}

/**
 * Executes unified search with optional AI semantic re-ranking and instant answer.
 */
export async function executeUnifiedSearch(
  query: string,
  ctx: WorkspaceContext,
  options: {
    module?: SearchModule | "all"
    includeAiSummary?: boolean
    model?: AIModel
  } = {}
): Promise<UnifiedSearchResponse> {
  const startAt = Date.now()
  const rawResults = await queryDatabaseAcrossModules(query, ctx, options.module, 10)

  if (rawResults.length === 0 || !query.trim()) {
    return {
      query,
      results: rawResults,
      totalMatches: rawResults.length,
      source: "keyword",
      latencyMs: Date.now() - startAt,
    }
  }

  // If AI summary / semantic ranking is not requested or query is trivial keyword
  if (!options.includeAiSummary && query.trim().length < 3) {
    return {
      query,
      results: rawResults,
      totalMatches: rawResults.length,
      source: "keyword",
      latencyMs: Date.now() - startAt,
    }
  }

  // AI Semantic Re-ranking & Synthesis
  try {
    const candidateSummary = rawResults.slice(0, 25).map((r, i) => 
      `[${i}] id="${r.id}" mod="${r.moduleName}" title="${r.title}" sub="${r.subtitle || ""}" snippet="${r.snippet || ""}"`
    ).join("\n")

    const prompt = `You are the AI Search Engine for Aura360.
User query: "${query}"

Here are items found across the user's workspace:
${candidateSummary}

Instructions:
1. Provide a concise 1-sentence instant answer/summary answering the user query directly based on the data (or summarizing the key matches).
2. Rank the item indices in order of semantic relevance to the query.

Return ONLY a JSON object:
{
  "summary": "<one crisp sentence summarizing or answering the query>",
  "rankedIndices": [<numbers of the most relevant items, up to 10>]
}`

    let aiData: { summary?: string; rankedIndices?: number[] } | null = null

    // Try Groq / OpenAI first
    if (openaiGroqClient.isAvailable("groq") || openaiGroqClient.isAvailable("openai")) {
      try {
        const res = await openaiGroqClient.generateText(
          { prompt },
          { model: options.model || "qwen/qwen3.8-27b", config: { temperature: 0.1, maxOutputTokens: 400 } }
        )
        const cleaned = res.text.trim().replace(/^```json/i, "").replace(/```$/, "").trim()
        aiData = JSON.parse(cleaned)
      } catch {}
    }

    // Fallback to Gemini
    if (!aiData && geminiClient.isAvailable()) {
      try {
        const res = await geminiClient.generateJson<{ summary?: string; rankedIndices?: number[] }>(
          { prompt },
          { model: FAST_MODEL, config: { temperature: 0.1 } }
        )
        aiData = res.data
      } catch {}
    }

    if (aiData) {
      const reordered: PlatformSearchResult[] = []
      const usedSet = new Set<string>()

      if (Array.isArray(aiData.rankedIndices)) {
        for (const idx of aiData.rankedIndices) {
          const item = rawResults[idx]
          if (item && !usedSet.has(item.id)) {
            reordered.push(item)
            usedSet.add(item.id)
          }
        }
      }

      // Append remaining items
      for (const item of rawResults) {
        if (!usedSet.has(item.id)) {
          reordered.push(item)
        }
      }

      return {
        query,
        results: reordered,
        aiSummary: aiData.summary || undefined,
        totalMatches: rawResults.length,
        source: "ai",
        latencyMs: Date.now() - startAt,
      }
    }
  } catch (err) {
    console.warn("[executeUnifiedSearch] AI synthesis failed, returning keyword matches:", err)
  }

  return {
    query,
    results: rawResults,
    totalMatches: rawResults.length,
    source: "keyword",
    latencyMs: Date.now() - startAt,
  }
}
