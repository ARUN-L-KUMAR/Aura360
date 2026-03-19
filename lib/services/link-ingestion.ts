import OpenAI from "openai"
import * as cheerio from "cheerio"
import { and, eq } from "drizzle-orm"
import { isIP } from "node:net"
import { z } from "zod"
import { db, ingestedLinks, type WorkspaceContext } from "@/lib/db"

export type IngestionPlatform = "instagram" | "youtube" | "ecommerce" | "generic"
export type IngestionType = "video" | "product" | "article" | "other"
export type SuggestedModule = "fashion" | "notes" | "saved" | "food" | "fitness"

type FetchMetadataResult = {
  title: string
  description: string | null
  imageUrl: string | null
  siteName: string | null
  canonicalUrl: string | null
  ogType: string | null
  detectedType: IngestionType
  extra: Record<string, unknown>
}

type ClassificationResult = {
  category: SuggestedModule
  confidence: number
  reasoning: string
}

export type IngestLinkResult = {
  id: string
  url: string
  normalizedUrl: string
  title: string
  description: string | null
  image: string | null
  source: IngestionPlatform
  type: IngestionType
  suggestedModule: SuggestedModule
  confidence: number
  metadata: Record<string, unknown>
  cached: boolean
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

const AI_CLASSIFICATION_SCHEMA = z.object({
  category: z.enum(["fashion", "notes", "saved", "food", "fitness"]),
  confidence: z.number().min(0).max(1),
})

export function detectPlatform(url: string): IngestionPlatform {
  const hostname = new URL(url).hostname.toLowerCase()

  if (hostname.includes("instagram.com")) return "instagram"
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube"
  if (
    hostname.includes("amazon.") ||
    hostname.includes("flipkart.") ||
    hostname.includes("myntra.")
  ) {
    return "ecommerce"
  }

  return "generic"
}

export function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim())
  parsed.hash = ""

  const trackingParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "igshid",
  ]

  for (const param of trackingParams) {
    parsed.searchParams.delete(param)
  }

  if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
    parsed.port = ""
  }

  if (parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1) || "/"
  }

  return parsed.toString()
}

export function validateExternalUrl(rawUrl: string): { valid: boolean; reason?: string } {
  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch {
    return { valid: false, reason: "Invalid URL" }
  }

  if (!parsed.protocol || !["https:", "http:"].includes(parsed.protocol)) {
    return { valid: false, reason: "Only http/https URLs are supported" }
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "URL authentication is not allowed" }
  }

  const hostname = parsed.hostname.toLowerCase()

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { valid: false, reason: "Local/internal hosts are not allowed" }
  }

  const ipVersion = isIP(hostname)
  if (ipVersion === 4 && isPrivateIpv4(hostname)) {
    return { valid: false, reason: "Private network IPv4 addresses are not allowed" }
  }

  if (ipVersion === 6 && isPrivateIpv6(hostname)) {
    return { valid: false, reason: "Private network IPv6 addresses are not allowed" }
  }

  return { valid: true }
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number)

  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return true
  }

  const [first, second] = octets

  if (first === 10 || first === 127 || first === 0) return true
  if (first === 169 && second === 254) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 192 && second === 168) return true

  return false
}

function isPrivateIpv6(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  if (lower === "::1") return true
  if (lower.startsWith("fe80:")) return true
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true

  return false
}

function normalizeTypeFromOgType(ogType: string | null): IngestionType {
  if (!ogType) return "other"

  const lower = ogType.toLowerCase()
  if (lower.includes("video")) return "video"
  if (lower.includes("product")) return "product"
  if (lower.includes("article")) return "article"

  return "other"
}

function inferType(platform: IngestionPlatform, metadata: FetchMetadataResult): IngestionType {
  if (platform === "youtube" || platform === "instagram") return "video"
  if (platform === "ecommerce") return "product"

  if (metadata.detectedType !== "other") return metadata.detectedType

  const haystack = `${metadata.title} ${metadata.description ?? ""}`.toLowerCase()
  if (/(watch|video|reel|shorts|trailer)\b/.test(haystack)) return "video"
  if (/(buy|price|sale|shop|product|add to cart|wishlist)\b/.test(haystack)) return "product"
  if (/(blog|article|read|guide|tutorial|how to)\b/.test(haystack)) return "article"

  return "other"
}

function classifyByRules(input: {
  platform: IngestionPlatform
  type: IngestionType
  title: string
  description: string | null
  url: string
}): ClassificationResult {
  const haystack = `${input.title} ${input.description ?? ""} ${input.url}`.toLowerCase()

  if (/(dress|shirt|jacket|jeans|sneaker|sneakers|shoe|heels|bag|watch|fashion|outfit|wardrobe|streetwear|kurta)\b/.test(haystack)) {
    return { category: "fashion", confidence: 0.9, reasoning: "fashion keyword match" }
  }

  if (/(recipe|cook|food|meal|restaurant|kitchen|biryani|diet plan|nutrition)\b/.test(haystack)) {
    return { category: "food", confidence: 0.85, reasoning: "food keyword match" }
  }

  if (/(workout|gym|exercise|fitness|protein|cardio|strength|yoga|running|training)\b/.test(haystack)) {
    return { category: "fitness", confidence: 0.85, reasoning: "fitness keyword match" }
  }

  if (input.type === "product" && input.platform === "ecommerce") {
    return { category: "saved", confidence: 0.74, reasoning: "generic ecommerce item" }
  }

  if (input.type === "article") {
    return { category: "notes", confidence: 0.72, reasoning: "article-like content" }
  }

  if (input.platform === "youtube") {
    return { category: "notes", confidence: 0.67, reasoning: "video often useful for notes" }
  }

  return { category: "saved", confidence: 0.55, reasoning: "default bucket" }
}

async function classifyWithOpenAI(input: {
  title: string
  description: string | null
  url: string
  platform: IngestionPlatform
  type: IngestionType
}): Promise<ClassificationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You classify links for a personal workspace app. Return strict JSON with fields: category (fashion|notes|saved|food|fitness), confidence (0..1).",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            description: input.description,
            url: input.url,
            platform: input.platform,
            type: input.type,
          }),
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const parsed = AI_CLASSIFICATION_SCHEMA.safeParse(JSON.parse(content))
    if (!parsed.success) return null

    return {
      category: parsed.data.category,
      confidence: parsed.data.confidence,
      reasoning: "openai classification",
    }
  } catch (error) {
    console.error("[Ingest] OpenAI classification failed:", error)
    return null
  }
}

async function fetchYouTubeOEmbed(url: string): Promise<Partial<FetchMetadataResult>> {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "User-Agent": "Aura360Bot/1.0",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })

    if (!response.ok) {
      return {}
    }

    const data = (await response.json()) as {
      title?: string
      thumbnail_url?: string
      author_name?: string
      provider_name?: string
    }

    return {
      title: data.title ?? "Untitled",
      description: null,
      imageUrl: data.thumbnail_url ?? null,
      siteName: data.provider_name ?? "YouTube",
      extra: {
        authorName: data.author_name ?? null,
      },
    }
  } catch (error) {
    console.error("[Ingest] YouTube oEmbed fetch failed:", error)
    return {}
  }
}

async function fetchOpenGraphMetadata(url: string): Promise<FetchMetadataResult> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Aura360Bot/1.0 (+https://aura360.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: HTTP ${response.status}`)
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("URL did not return HTML content")
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  const getMeta = (...selectors: string[]) => {
    for (const selector of selectors) {
      const value = $(selector).attr("content")?.trim()
      if (value) return value
    }
    return null
  }

  const title =
    getMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') ??
    $("title").first().text().trim() ??
    "Untitled"

  const description =
    getMeta('meta[property="og:description"]', 'meta[name="description"]', 'meta[name="twitter:description"]') ?? null

  const imageUrl =
    getMeta('meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[property="og:image:url"]') ?? null

  const ogType = getMeta('meta[property="og:type"]')

  const siteName =
    getMeta('meta[property="og:site_name"]') ??
    (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "")
      } catch {
        return null
      }
    })()

  const canonicalUrl = $('link[rel="canonical"]').attr("href")?.trim() ?? null

  const price =
    getMeta('meta[property="product:price:amount"]', 'meta[name="price"]') ?? null

  return {
    title,
    description,
    imageUrl,
    siteName,
    canonicalUrl,
    ogType,
    detectedType: normalizeTypeFromOgType(ogType),
    extra: {
      price,
    },
  }
}

async function extractMetadata(url: string, platform: IngestionPlatform): Promise<FetchMetadataResult> {
  let metadata: FetchMetadataResult

  try {
    metadata = await fetchOpenGraphMetadata(url)
  } catch (error) {
    console.error("[Ingest] OpenGraph fetch failed:", error)
    metadata = {
      title: "Untitled",
      description: null,
      imageUrl: null,
      siteName: null,
      canonicalUrl: null,
      ogType: null,
      detectedType: "other",
      extra: {},
    }
  }

  if (platform === "youtube" && (!metadata.title || metadata.title === "Untitled" || !metadata.imageUrl)) {
    const youtubeFallback = await fetchYouTubeOEmbed(url)
    metadata = {
      ...metadata,
      title: youtubeFallback.title ?? metadata.title,
      imageUrl: youtubeFallback.imageUrl ?? metadata.imageUrl,
      siteName: youtubeFallback.siteName ?? metadata.siteName,
      extra: {
        ...metadata.extra,
        ...(youtubeFallback.extra ?? {}),
      },
    }
  }

  return metadata
}

function mapRecordToResult(record: typeof ingestedLinks.$inferSelect, cached: boolean): IngestLinkResult {
  return {
    id: record.id,
    url: record.url,
    normalizedUrl: record.normalizedUrl,
    title: record.title,
    description: record.description,
    image: record.imageUrl,
    source: record.source as IngestionPlatform,
    type: record.type as IngestionType,
    suggestedModule: record.suggestedModule as SuggestedModule,
    confidence: record.confidence ? Number.parseFloat(record.confidence) : 0,
    metadata: (record.metadata as Record<string, unknown> | null) ?? {},
    cached,
  }
}

export async function ingestLink(input: {
  context: WorkspaceContext
  url: string
  forceRefresh?: boolean
}): Promise<IngestLinkResult> {
  const urlValidation = validateExternalUrl(input.url)
  if (!urlValidation.valid) {
    throw new Error(urlValidation.reason ?? "Invalid URL")
  }

  const normalizedUrl = normalizeUrl(input.url)

  const [existing] = await db
    .select()
    .from(ingestedLinks)
    .where(
      and(
        eq(ingestedLinks.workspaceId, input.context.workspaceId),
        eq(ingestedLinks.userId, input.context.userId),
        eq(ingestedLinks.normalizedUrl, normalizedUrl)
      )
    )
    .limit(1)

  const isFresh =
    existing &&
    existing.lastFetchedAt instanceof Date &&
    Date.now() - existing.lastFetchedAt.getTime() < CACHE_TTL_MS

  if (existing && isFresh && !input.forceRefresh) {
    return mapRecordToResult(existing, true)
  }

  const platform = detectPlatform(normalizedUrl)
  const metadata = await extractMetadata(normalizedUrl, platform)
  const type = inferType(platform, metadata)

  const ruleClassification = classifyByRules({
    platform,
    type,
    title: metadata.title,
    description: metadata.description,
    url: normalizedUrl,
  })

  const aiClassification = await classifyWithOpenAI({
    title: metadata.title,
    description: metadata.description,
    url: normalizedUrl,
    platform,
    type,
  })

  const classification = aiClassification ?? ruleClassification

  const now = new Date()

  const payload: typeof ingestedLinks.$inferInsert = {
    workspaceId: input.context.workspaceId,
    userId: input.context.userId,
    url: input.url,
    normalizedUrl,
    title: metadata.title || "Untitled",
    description: metadata.description,
    imageUrl: metadata.imageUrl,
    source: platform,
    type,
    suggestedModule: classification.category,
    confidence: classification.confidence.toFixed(3),
    metadata: {
      siteName: metadata.siteName,
      canonicalUrl: metadata.canonicalUrl,
      ogType: metadata.ogType,
      extraction: metadata.extra,
      classificationReasoning: classification.reasoning,
    },
    lastFetchedAt: now,
    updatedAt: now,
  }

  if (existing) {
    const [updated] = await db
      .update(ingestedLinks)
      .set(payload)
      .where(eq(ingestedLinks.id, existing.id))
      .returning()

    return mapRecordToResult(updated, false)
  }

  const [created] = await db
    .insert(ingestedLinks)
    .values(payload)
    .returning()

  return mapRecordToResult(created, false)
}
