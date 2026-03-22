/**
 * Gemini-powered link enricher
 *
 * Given a URL and its scraped HTML metadata, calls Gemini to:
 * 1. Classify which module the link belongs to (fashion/notes/saved/food/fitness)
 * 2. Extract rich, type-aware structured metadata based on content type
 *
 * Falls back to rule-based classification if GEMINI_API_KEY is not set.
 */

export type SuggestedModule = "fashion" | "notes" | "saved" | "food" | "fitness"

// ─── Per-type enrichment schemas ─────────────────────────────────────────────

export interface ProductEnrichment {
  contentType: "product"
  name: string
  price: string | null          // e.g. "₹1,999" or "$29.99"
  originalPrice: string | null  // before discount
  discount: string | null       // e.g. "20% off"
  brand: string | null
  color: string | null
  size: string | null           // available sizes if shown
  store: string                 // amazon / flipkart / myntra / ajio / meesho / other
  buyingLink: string            // canonical product URL
  rating: string | null         // e.g. "4.3/5"
  category: string | null       // e.g. "Men's Footwear"
}

export interface InstagramEnrichment {
  contentType: "instagram"
  subtype: "reel" | "post" | "story" | "unknown"
  creator: string | null        // @handle
  caption: string | null
  hashtags: string[]
  contentTheme: string | null   // e.g. "fashion haul", "cooking tutorial"
  music: string | null          // song name if reel
}

export interface YouTubeEnrichment {
  contentType: "youtube"
  title: string
  channelName: string | null
  description: string | null    // short summary
  duration: string | null       // e.g. "12 mins"
  topic: string | null          // e.g. "fitness workout", "travel vlog"
}

export interface RecipeEnrichment {
  contentType: "recipe"
  dishName: string
  cuisine: string | null        // e.g. "Indian", "Italian"
  prepTime: string | null
  cookTime: string | null
  servings: string | null
  mainIngredients: string[]
  difficulty: string | null     // Easy / Medium / Hard
  mealType: string | null       // Breakfast / Lunch / Dinner / Snack
}

export interface FitnessEnrichment {
  contentType: "fitness"
  workoutType: string | null    // e.g. "HIIT", "Yoga", "Strength training"
  muscleGroups: string[]
  duration: string | null
  difficulty: string | null
  equipment: string | null
  goal: string | null           // weight loss / muscle gain / flexibility
}

export interface ArticleEnrichment {
  contentType: "article"
  headline: string
  author: string | null
  publication: string | null
  publishedDate: string | null
  summary: string | null        // 1–2 sentence summary
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
}

// ─── Gemini endpoint ──────────────────────────────────────────────────────────
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

function buildPrompt(input: {
  url: string
  title: string
  description: string | null
  siteName: string | null
  pageText: string | null
}): string {
  return `
You are an intelligent link metadata extractor for a personal productivity app called Aura360.

Given details about a web link, do two things:
1. Decide which MODULE best fits: fashion | notes | saved | food | fitness
2. Extract rich structured metadata that is specific to the content type.

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

Return ONLY a valid JSON object (no markdown, no explanation) with exactly these fields:
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
function ruleBasedEnrich(input: {
  url: string
  title: string
  description: string | null
  siteName: string | null
}): EnrichmentResult {
  const haystack = `${input.title} ${input.description ?? ""} ${input.url}`.toLowerCase()
  const hostname = (() => { try { return new URL(input.url).hostname } catch { return "" } })()

  // Module classification
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

  // Platform-aware module overrides
  if (hostname.includes("instagram.com")) { module = "saved"; confidence = 0.75 }
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) { module = "notes"; confidence = 0.67 }

  // Determine content type for enrichment
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
      name: input.title,
      price: null, originalPrice: null, discount: null,
      brand: null, color: null, size: null,
      store, buyingLink: input.url,
      rating: null, category: null,
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
    enrichment = {
      contentType: "generic",
      summary: input.description,
      keyTopics: [],
    }
  }

  return { module, confidence, enrichment, enrichedBy: "rules" }
}

// ─── Main enricher ────────────────────────────────────────────────────────────
export async function enrichLink(input: {
  url: string
  title: string
  description: string | null
  siteName: string | null
  pageText: string | null   // first ~2000 chars of visible page text (stripped HTML)
}): Promise<EnrichmentResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return ruleBasedEnrich(input)
  }

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) throw new Error(`Gemini API ${res.status}`)

    const body = await res.json()
    const rawJson: string = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
    const g = JSON.parse(rawJson)

    if (!g.module || !g.enrichment) throw new Error("Invalid Gemini response shape")

    return {
      module: g.module as SuggestedModule,
      confidence: typeof g.confidence === "number" ? g.confidence : 0.8,
      enrichment: g.enrichment as LinkEnrichment,
      enrichedBy: "gemini",
    }
  } catch (err) {
    console.warn("[gemini-link-enricher] Gemini failed, falling back to rules:", err)
    return ruleBasedEnrich(input)
  }
}
