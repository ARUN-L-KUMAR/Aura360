/**
 * AI-powered link enricher (refactored)
 *
 * Uses the shared GeminiClient instead of raw fetch.
 * Public API is identical to the original gemini-link-enricher.ts
 * so existing imports via lib/services/ continue to work.
 */

import { geminiClient } from "../gemini-client"
import type { AIUsageMetadata } from "../types"

// ─── Per-type enrichment schemas (re-exported for consumers) ──────────────────

export type SuggestedModule = "fashion" | "notes" | "saved" | "food" | "fitness" | "skincare" | "time"

export interface ProductEnrichment {
  contentType: "product"
  name: string
  price: string | null
  originalPrice: string | null
  discount: string | null
  brand: string | null
  color: string | null
  size: string | null
  store: string
  buyingLink: string
  rating: string | null
  category: string | null
}

export interface InstagramEnrichment {
  contentType: "instagram"
  subtype: "reel" | "post" | "story" | "unknown"
  creator: string | null
  caption: string | null
  hashtags: string[]
  contentTheme: string | null
  music: string | null
}

export interface YouTubeEnrichment {
  contentType: "youtube"
  title: string
  channelName: string | null
  description: string | null
  duration: string | null
  topic: string | null
}

export interface RecipeEnrichment {
  contentType: "recipe"
  dishName: string
  cuisine: string | null
  prepTime: string | null
  cookTime: string | null
  servings: string | null
  mainIngredients: string[]
  difficulty: string | null
  mealType: string | null
}

export interface FitnessEnrichment {
  contentType: "fitness"
  workoutType: string | null
  muscleGroups: string[]
  duration: string | null
  difficulty: string | null
  equipment: string | null
  goal: string | null
}

export interface ArticleEnrichment {
  contentType: "article"
  headline: string
  author: string | null
  publication: string | null
  publishedDate: string | null
  summary: string | null
  readingTime: string | null
  topics: string[]
}

export interface GenericEnrichment {
  contentType: "generic"
  summary: string | null
  keyTopics: string[]
}

export type LinkEnrichment =
  | ProductEnrichment
  | InstagramEnrichment
  | YouTubeEnrichment
  | RecipeEnrichment
  | FitnessEnrichment
  | ArticleEnrichment
  | GenericEnrichment

export interface EnrichmentResult {
  module: SuggestedModule
  confidence: number
  enrichment: LinkEnrichment
  enrichedBy: "gemini" | "rules"
  usage?: AIUsageMetadata
}

export interface LinkEnricherInput {
  url: string
  title: string
  description: string | null
  siteName: string | null
  pageText: string | null
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(input: LinkEnricherInput): string {
  return `
You are an intelligent link metadata extractor for a personal productivity app called Aura360.

Given details about a web link, do two things:
1. Decide which MODULE best fits: fashion | notes | saved | food | fitness
2. Extract rich structured metadata specific to the content type.

MODULES:
- fashion: clothing, shoes, accessories, beauty products, style content
- food: recipes, restaurants, food delivery, nutrition, meal plans
- fitness: workouts, gym, yoga, running, sports, health exercises
- notes: articles, blog posts, research, news, tutorials, YouTube videos (unless fitness/food)
- saved: e-commerce products that don't fit fashion (electronics, home, books, etc.), general bookmarks

CONTENT TYPES and their fields:

If it's a PRODUCT from an e-commerce store (Amazon, Flipkart, Myntra, Ajio, Meesho, Nykaa, etc.):
Return: { "contentType": "product", "name": <string>, "price": <"₹X" or null>, "originalPrice": <string|null>, "discount": <string|null>, "brand": <string|null>, "color": <string|null>, "size": <string|null>, "store": <"amazon"|"flipkart"|"myntra"|"ajio"|"meesho"|"nykaa"|"other">, "buyingLink": <url string>, "rating": <string|null>, "category": <string|null> }

If it's an INSTAGRAM link (reel, post, story):
Return: { "contentType": "instagram", "subtype": <"reel"|"post"|"story"|"unknown">, "creator": <@handle or null>, "caption": <string|null>, "hashtags": [<string>], "contentTheme": <string|null>, "music": <string|null> }

If it's a YOUTUBE video:
Return: { "contentType": "youtube", "title": <string>, "channelName": <string|null>, "description": <string|null>, "duration": <string|null>, "topic": <string|null> }

If it's a RECIPE or food content:
Return: { "contentType": "recipe", "dishName": <string>, "cuisine": <string|null>, "prepTime": <string|null>, "cookTime": <string|null>, "servings": <string|null>, "mainIngredients": [<string>], "difficulty": <"Easy"|"Medium"|"Hard"|null>, "mealType": <string|null> }

If it's FITNESS content:
Return: { "contentType": "fitness", "workoutType": <string|null>, "muscleGroups": [<string>], "duration": <string|null>, "difficulty": <string|null>, "equipment": <string|null>, "goal": <string|null> }

If it's an ARTICLE or blog post:
Return: { "contentType": "article", "headline": <string>, "author": <string|null>, "publication": <string|null>, "publishedDate": <string|null>, "summary": <string|null>, "readingTime": <string|null>, "topics": [<string>] }

Otherwise:
Return: { "contentType": "generic", "summary": <string|null>, "keyTopics": [<string>] }

Return ONLY a valid JSON object with exactly these fields:
{
  "module": <"fashion"|"notes"|"saved"|"food"|"fitness">,
  "confidence": <0.0 to 1.0>,
  "enrichment": { ... the type-specific object above ... }
}

Link details:
URL: ${input.url}
Title: ${input.title}
Description: ${input.description ?? "(none)"}
Site: ${input.siteName ?? "(unknown)"}
Page text snippet: ${input.pageText ? input.pageText.substring(0, 1500) : "(not available)"}
`.trim()
}

// ─── Rule-based fallback ──────────────────────────────────────────────────────

function ruleBasedEnrich(input: LinkEnricherInput): EnrichmentResult {
  const haystack = `${input.title} ${input.description ?? ""} ${input.url}`.toLowerCase()
  const hostname = (() => {
    try {
      return new URL(input.url).hostname
    } catch {
      return ""
    }
  })()

  let module: SuggestedModule = "saved"
  let confidence = 0.55

  if (/(dress|shirt|jacket|jeans|sneaker|shoe|heels|bag|watch|fashion|outfit|kurta|saree|lehenga)/.test(haystack)) {
    module = "fashion"; confidence = 0.88
  } else if (/(recipe|cook|food|meal|restaurant|biryani|diet|nutrition|cuisine)/.test(haystack)) {
    module = "food"; confidence = 0.85
  } else if (/(workout|gym|exercise|fitness|protein|cardio|yoga|running|training)/.test(haystack)) {
    module = "fitness"; confidence = 0.85
  } else if (/(article|blog|read|guide|tutorial|how.to|news|research)/.test(haystack)) {
    module = "notes"; confidence = 0.72
  }

  if (hostname.includes("instagram.com")) { module = "saved"; confidence = 0.75 }
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) { module = "notes"; confidence = 0.67 }

  const isEcommerce = /(amazon\.|flipkart\.|myntra\.|ajio\.|meesho\.|nykaa\.)/.test(hostname)
  const isInstagram = hostname.includes("instagram.com")
  const isYouTube   = hostname.includes("youtube.com") || hostname.includes("youtu.be")

  let enrichment: LinkEnrichment

  if (isEcommerce) {
    const store = hostname.includes("amazon")   ? "amazon"
                : hostname.includes("flipkart") ? "flipkart"
                : hostname.includes("myntra")   ? "myntra"
                : hostname.includes("ajio")     ? "ajio"
                : hostname.includes("meesho")   ? "meesho"
                : hostname.includes("nykaa")    ? "nykaa"
                : "other"
    enrichment = {
      contentType: "product",
      name: input.title, price: null, originalPrice: null, discount: null,
      brand: null, color: null, size: null,
      store, buyingLink: input.url, rating: null, category: null,
    }
  } else if (isInstagram) {
    enrichment = {
      contentType: "instagram",
      subtype: input.url.includes("/reel") ? "reel" : input.url.includes("/stories") ? "story" : "post",
      creator: null, caption: input.description, hashtags: [], contentTheme: null, music: null,
    }
  } else if (isYouTube) {
    enrichment = {
      contentType: "youtube",
      title: input.title, channelName: null,
      description: input.description, duration: null, topic: null,
    }
  } else {
    enrichment = { contentType: "generic", summary: input.description, keyTopics: [] }
  }

  return { module, confidence, enrichment, enrichedBy: "rules" }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function enrichLink(input: LinkEnricherInput): Promise<EnrichmentResult> {
  if (!geminiClient.isAvailable()) {
    return ruleBasedEnrich(input)
  }

  try {
    const { data, usage } = await geminiClient.generateJson<{
      module: SuggestedModule
      confidence: number
      enrichment: LinkEnrichment
    }>(
      { prompt: buildPrompt(input) },
      { config: { temperature: 0, maxOutputTokens: 1024, timeoutMs: 10_000 } }
    )

    if (!data.module || !data.enrichment) throw new Error("Invalid Gemini response shape")

    return {
      module: data.module,
      confidence: typeof data.confidence === "number" ? data.confidence : 0.8,
      enrichment: data.enrichment,
      enrichedBy: "gemini",
      usage,
    }
  } catch (err) {
    console.warn("[ai/link-enricher] Gemini failed, falling back to rules:", err)
    return ruleBasedEnrich(input)
  }
}
