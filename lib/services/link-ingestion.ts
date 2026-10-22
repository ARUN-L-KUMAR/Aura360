import * as cheerio from "cheerio"
import { and, eq } from "drizzle-orm"
import { isIP } from "node:net"
import { db, ingestedLinks, type WorkspaceContext } from "@/lib/db"
import { enrichLink, type SuggestedModule } from "@/lib/services/gemini-link-enricher"
import { classifyProduct, type ProductClassification } from "@/lib/services/product-category"

export type IngestionPlatform = "instagram" | "youtube" | "ecommerce" | "generic"
export type IngestionType = "video" | "product" | "article" | "other"
export type { SuggestedModule }

type FetchMetadataResult = {
  title: string
  description: string | null
  imageUrl: string | null
  siteName: string | null
  canonicalUrl: string | null
  ogType: string | null
  detectedType: IngestionType
  pageText: string | null   // visible text for Gemini
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

/** Titles a shop's bot wall or a failed read leaves behind: not worth keeping over the name the app was shared with. */
const WEAK_TITLE = /^(untitled|amazon(\.[a-z.]+)?|flipkart(\.com)?|myntra|ajio|meesho|robot check|access denied|attention required.*|just a moment.*|sorry.*|page not found.*|are you a human.*|something went wrong.*)$/i

export function isWeakTitle(title: string | null | undefined): boolean {
  const clean = (title ?? "").replace(/\s+/g, " ").trim()
  return clean.length < 3 || WEAK_TITLE.test(clean)
}

/** The product facts a shop page gave us, kept with the link so saving it later does not need a second read. */
export type IngestedProduct = {
  store: string
  price: string | null
  originalPrice: string | null
  currency: string | null
  brand: string | null
  color: string | null
  rating: string | null
  /** The scraper's own Fashion category ("tops", "shoes", ...) or "general". */
  scrapedCategory: string | null
  images: string[]
}


export function detectPlatform(url: string): IngestionPlatform {
  const hostname = new URL(url).hostname.toLowerCase()

  if (hostname.includes("instagram.com")) return "instagram"
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube"
  if (
    /(^|\.)(amazon\.|amzn\.|a\.co$|flipkart\.|fkrt\.|myntra\.|myntr\.it$|ajio\.|ajiio\.|ajioapps\.|meesho\.|nykaa\.)/.test(hostname)
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

  const pageText = $('body')
    .clone()
    .find('script, style, noscript, svg, img, nav, footer, header, aside')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000) || null

  return {
    title,
    description,
    imageUrl,
    siteName,
    canonicalUrl,
    ogType,
    detectedType: normalizeTypeFromOgType(ogType),
    pageText,
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
      pageText: null,
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

/**
 * Reads a shop page (Amazon, Flipkart, Myntra, Ajio, Meesho) with the product scraper, which knows these shops' share
 * links and their bot walls. Returns null when the shop refuses: the caller then falls back to the page's own tags and
 * to the name the app was shared with.
 */
async function scrapeShop(url: string): Promise<{ metadata: FetchMetadataResult; product: IngestedProduct } | null> {
  // Loaded when needed: product-scraper itself imports validateExternalUrl from this file.
  const { detectShoppingPlatform, scrapeProduct } = await import("@/lib/services/product-scraper")
  const store = detectShoppingPlatform(url)
  if (!store) return null

  try {
    const scraped = await scrapeProduct(url)
    const images = (scraped.images ?? []).filter(Boolean)
    return {
      metadata: {
        title: scraped.product_name || "Untitled",
        description: scraped.description ? scraped.description.slice(0, 600) : null,
        imageUrl: images[0] ?? null,
        siteName: store,
        canonicalUrl: scraped.buying_link || null,
        ogType: "product",
        detectedType: "product",
        pageText: [scraped.brand, scraped.product_name, scraped.description].filter(Boolean).join(" ").slice(0, 1500) || null,
        extra: { price: scraped.price?.current || null },
      },
      product: {
        store,
        price: scraped.price?.current || null,
        originalPrice: scraped.price?.original || null,
        currency: scraped.currency || "INR",
        brand: scraped.brand || null,
        color: scraped.color || null,
        rating: scraped.rating || null,
        scrapedCategory: scraped.category || null,
        images: images.slice(0, 6),
      },
    }
  } catch (error) {
    console.warn("[Ingest] Product scrape failed, using page tags instead:", error instanceof Error ? error.message : error)
    return null
  }
}

export async function ingestLink(input: {
  context: WorkspaceContext
  url: string
  forceRefresh?: boolean
  /** The words the app was shared with next to the link ("Check out Roadster Men T-shirt ..."), used when the shop blocks us. */
  hintTitle?: string
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

  // A read that only got a bot-wall title is worth repeating when the person shared the link with a name for it.
  const cachedIsWeak = !!existing && isWeakTitle(existing.title) && !!input.hintTitle
  if (existing && isFresh && !input.forceRefresh && !cachedIsWeak) {
    return mapRecordToResult(existing, true)
  }

  const platform = detectPlatform(normalizedUrl)
  const shop = platform === "ecommerce" ? await scrapeShop(normalizedUrl) : null
  const metadata = shop?.metadata ?? (await extractMetadata(normalizedUrl, platform))
  if (platform === "ecommerce" && isWeakTitle(metadata.title) && input.hintTitle) {
    metadata.title = input.hintTitle
  }
  const type = inferType(platform, metadata)

  // ── Enrich with Gemini (classification + structured metadata) ──────
  const enrichResult = await enrichLink({
    url: normalizedUrl,
    title: metadata.title,
    description: metadata.description,
    siteName: metadata.siteName,
    pageText: metadata.pageText ?? null,
  })

  // Shopping links go to Fashion (clothes, footwear, wearable accessories) or to Saved with a product category.
  let classification: ProductClassification | null = null
  let suggestedModule: SuggestedModule = enrichResult.module
  if (platform === "ecommerce") {
    const ai = enrichResult.enrichment.contentType === "product" ? enrichResult.enrichment : null
    classification = classifyProduct({
      title: metadata.title,
      description: metadata.description,
      scrapedCategory: shop?.product.scrapedCategory,
      aiModule: enrichResult.module,
      aiCategory: ai?.category,
      store: shop?.product.store ?? ai?.store,
    })
    suggestedModule = classification.module
  }

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
    suggestedModule,
    confidence: enrichResult.confidence.toFixed(3),
    metadata: {
      siteName: metadata.siteName,
      canonicalUrl: metadata.canonicalUrl,
      ogType: metadata.ogType,
      extraction: metadata.extra,
      enrichedBy: enrichResult.enrichedBy,
      ...(shop ? { product: shop.product } : {}),
      ...(classification ? { classification } : {}),
      // The full structured enrichment — accessible in the UI
      enrichment: enrichResult.enrichment,
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
