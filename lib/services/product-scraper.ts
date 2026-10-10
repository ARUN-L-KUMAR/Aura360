import * as cheerio from "cheerio"
import { validateExternalUrl } from "@/lib/services/link-ingestion"
import type { MeasurementReading, ScrapedProduct, SizeChartRow } from "@/lib/types/fashion"

export type ShoppingPlatform = "amazon" | "flipkart" | "myntra" | "meesho" | "ajio"

const PLATFORM_HOSTS: Array<{ platform: ShoppingPlatform; test: RegExp }> = [
  { platform: "amazon", test: /(^|\.)(amazon\.[a-z.]+|amzn\.(in|to|com|eu)|a\.co)$/ },
  { platform: "flipkart", test: /(^|\.)(flipkart\.com|fkrt\.(it|cc))$/ },
  { platform: "myntra", test: /(^|\.)myntra\.com$/ },
  { platform: "meesho", test: /(^|\.)meesho\.com$/ },
  { platform: "ajio", test: /(^|\.)(ajio\.com|ajiio\.in)$|^ajioapps\.onelink\.me$/ },
]

const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 3 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15000

export class ProductScrapeError extends Error {
  constructor(message: string, public status = 422) {
    super(message)
  }
}

export function detectShoppingPlatform(rawUrl: string): ShoppingPlatform | null {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase()
    return PLATFORM_HOSTS.find((p) => p.test.test(host))?.platform ?? null
  } catch {
    return null
  }
}

// Only fetch known shopping hosts (also re-checked on every redirect hop). Keeps this endpoint
// from being used to probe internal services.
function assertAllowedUrl(rawUrl: string): ShoppingPlatform {
  const validation = validateExternalUrl(rawUrl)
  if (!validation.valid) throw new ProductScrapeError(validation.reason ?? "Invalid URL", 400)

  const platform = detectShoppingPlatform(rawUrl)
  if (!platform) {
    throw new ProductScrapeError("Unsupported site. Paste a link from Amazon, Flipkart, Myntra, Meesho or Ajio.", 400)
  }
  return platform
}

// The Ajio app's "Share" button produces an AppsFlyer OneLink (ajioapps.onelink.me/...). On a desktop browser it
// redirects to the Ajio *home page* and carries the real product page in a `deep_link_value` parameter, so follow
// that one redirect ourselves and take the product URL from it.
const SHARE_LINK_HOST = /^ajioapps\.onelink\.me$/

async function resolveShareLink(rawUrl: string): Promise<string> {
  let host = ""
  try {
    host = new URL(rawUrl).hostname.toLowerCase()
  } catch {
    return rawUrl
  }
  if (!SHARE_LINK_HOST.test(host)) return rawUrl

  const failure = new ProductScrapeError(
    "Couldn't read this Ajio share link. Open it in a browser and paste the product page address instead.",
    422
  )

  let location: string | null = null
  try {
    const response = await fetch(rawUrl, {
      headers: BROWSER_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })
    location = response.headers.get("location")
  } catch {
    throw failure
  }
  if (!location) throw failure

  const target = new URL(location, rawUrl)
  const candidate = target.searchParams.get("deep_link_value") ?? target.searchParams.get("af_web_dp") ?? target.toString()

  // The destination must itself be an allowed shop page, and a product page (not the home page)
  let product: URL
  try {
    product = new URL(candidate)
  } catch {
    throw failure
  }
  if (detectShoppingPlatform(product.toString()) !== "ajio" || !/\/p\/[^/]+/.test(product.pathname)) throw failure
  if (SHARE_LINK_HOST.test(product.hostname.toLowerCase())) throw failure

  return product.toString()
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
}

const BLOCK_MARKERS = [
  "robot check",
  "enter the characters you see below",
  "api-services-support@amazon.com",
  "access denied",
  "are you a human",
  "captcha",
  "something went wrong",
]

function looksBlocked(html: string): boolean {
  if (html.length < 400) return true
  const head = html.slice(0, 6000).toLowerCase()
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.toLowerCase() ?? ""
  return BLOCK_MARKERS.some((m) => title.includes(m) || (m !== "something went wrong" && head.includes(m)))
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return response.text()

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    chunks.push(value)
    if (total >= MAX_HTML_BYTES) {
      await reader.cancel()
      break
    }
  }
  return Buffer.concat(chunks).toString("utf-8")
}

/** Direct fetch with browser-like headers, following redirects manually so each hop is validated. */
async function fetchDirect(startUrl: string): Promise<{ html: string; finalUrl: string; blocked: boolean }> {
  let current = startUrl

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertAllowedUrl(current)

    const response = await fetch(current, {
      headers: BROWSER_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) throw new ProductScrapeError("Redirect without a destination")
      current = new URL(location, current).toString()
      continue
    }

    if (response.status === 403 || response.status === 429 || response.status === 503 || response.status === 529) {
      return { html: "", finalUrl: current, blocked: true }
    }
    if (!response.ok) {
      throw new ProductScrapeError(`The shop returned HTTP ${response.status} for this link`)
    }

    const html = await readCapped(response)
    return { html, finalUrl: current, blocked: looksBlocked(html) }
  }

  throw new ProductScrapeError("Too many redirects")
}

/**
 * Self-hosted renderer (see /scraper-service): a real Chromium on your own server / home connection.
 * Enabled by setting SCRAPER_SERVICE_URL and SCRAPER_SERVICE_KEY. Returns null when it is unreachable
 * (e.g. the laptop is off) so the caller can fall back to other methods.
 */
async function fetchViaRenderService(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const baseUrl = process.env.SCRAPER_SERVICE_URL
  const apiKey = process.env.SCRAPER_SERVICE_KEY
  if (!baseUrl || !apiKey) return null

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
    })
    if (!response.ok) {
      console.error(`[ProductScraper] Render service returned HTTP ${response.status}`)
      return null
    }

    const data = (await response.json()) as { html?: string; finalUrl?: string }
    if (!data.html || looksBlocked(data.html)) return null

    // The service already restricts redirects, but never trust a remote answer blindly
    const finalUrl = data.finalUrl && detectShoppingPlatform(data.finalUrl) ? data.finalUrl : url
    return { html: data.html, finalUrl }
  } catch (error) {
    console.error("[ProductScraper] Render service unreachable:", error)
    return null
  }
}

/**
 * Optional fallback for sites that block server requests. Enabled by setting SCRAPER_API_KEY
 * (ScraperAPI — has a free monthly allowance). JS rendering is only requested for the sites that need it.
 */
async function fetchViaScraperApi(url: string, platform: ShoppingPlatform): Promise<string | null> {
  const apiKey = process.env.SCRAPER_API_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({ api_key: apiKey, url, country_code: "in" })
  if (platform === "meesho" || platform === "ajio") params.set("render", "true")

  try {
    const response = await fetch(`https://api.scraperapi.com/?${params.toString()}`, {
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
    })
    if (!response.ok) return null
    const html = await response.text()
    return looksBlocked(html) ? null : html
  } catch (error) {
    console.error("[ProductScraper] ScraperAPI fallback failed:", error)
    return null
  }
}

// ── Parsing ────────────────────────────────────────────────────────────────

type Json = Record<string, any>

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function text(value: unknown): string {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim()
  if (typeof value === "number") return String(value)
  if (value && typeof value === "object" && "name" in (value as Json)) return text((value as Json).name)
  return ""
}

function isType(node: Json, type: string): boolean {
  return asArray(node["@type"]).some((t) => String(t).toLowerCase() === type.toLowerCase())
}

function collectJsonLdNodes(raw: unknown, out: Json[] = []): Json[] {
  if (Array.isArray(raw)) {
    raw.forEach((r) => collectJsonLdNodes(r, out))
  } else if (raw && typeof raw === "object") {
    out.push(raw as Json)
    const graph = (raw as Json)["@graph"]
    if (graph) collectJsonLdNodes(graph, out)
  }
  return out
}

function findProductJsonLd($: cheerio.CheerioAPI): Json | null {
  const nodes: Json[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text()
    try {
      collectJsonLdNodes(JSON.parse(raw), nodes)
    } catch {
      // some sites ship slightly invalid JSON-LD; skip it
    }
  })
  return nodes.find((n) => isType(n, "Product") || isType(n, "ProductGroup")) ?? null
}

function parsePrice(raw: unknown): string {
  const value = text(raw)
  if (!value) return ""
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/)
  if (!match) return ""
  const num = Number.parseFloat(match[0])
  return Number.isFinite(num) && num > 0 ? String(num) : ""
}

function pickOffer(product: Json): Json | null {
  const offers = asArray<Json>(product.offers)
  const first = offers[0]
  if (!first) return null
  // AggregateOffer wraps the individual offers
  return asArray<Json>(first.offers)[0] ?? first
}

function absolutize(src: string | undefined | null, base: string): string | null {
  if (!src) return null
  const trimmed = src.trim()
  if (!trimmed || trimmed.startsWith("data:")) return null
  try {
    return new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed, base).toString()
  } catch {
    return null
  }
}

/** Ask the CDNs for a larger rendition than the thumbnail the page links to. */
function upgradeImageUrl(url: string): string {
  // Amazon: ...._SX38_SY50_CR,0,0,38,50_.jpg → original
  if (url.includes("m.media-amazon.com") || url.includes("images-amazon.com")) {
    return url.replace(/\._[A-Z0-9,_]+_\./, ".")
  }
  // Flipkart: /image/128/128/ → /image/832/832/
  if (url.includes("flixcart.com")) {
    return url.replace(/\/image\/\d+\/\d+\//, "/image/832/832/").replace(/\?q=\d+/, "?q=80")
  }
  return url
}

function dedupe(urls: Array<string | null | undefined>, limit = 8): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    if (!u) continue
    const key = u.split("?")[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push(u)
    if (out.length >= limit) break
  }
  return out
}

function deriveCategory(haystack: string): string {
  const h = haystack.toLowerCase()
  if (/sneaker|shoe|sandal|slipper|flip.?flop|heel|loafer|boot|sliper|footwear/.test(h)) return "shoes"
  if (/jeans|trouser|pant|chino|jogger|legging|skirt|shorts|palazzo|cargo/.test(h)) return "bottoms"
  if (/dress|gown|jumpsuit|saree|sari|lehenga|kurta|kurti|salwar|co-?ord/.test(h)) return "dresses"
  if (/jacket|coat|blazer|hoodie|sweatshirt|sweater|cardigan|shrug|pullover/.test(h)) return "outerwear"
  if (/t-?shirt|shirt|top\b|tee\b|blouse|polo|tank|tunic/.test(h)) return "tops"
  if (/bag|backpack|wallet|belt|watch|sunglass|cap\b|hat\b|scarf|jewel|earring|necklace|bracelet|ring\b|tie\b/.test(h)) {
    return "accessories"
  }
  return "general"
}

function cleanHtmlText(html: string): string {
  return cheerio.load(`<div>${html}</div>`)("div").text().replace(/\s+/g, " ").trim()
}

/** Pulls the brand out of a title like "Roadster Men Navy Slim Fit T-shirt" only when nothing structured exists. */
function brandFromAmazonByline(raw: string): string {
  return raw
    .replace(/^visit the\s+/i, "")
    .replace(/\s+store$/i, "")
    .replace(/^brand:\s*/i, "")
    .trim()
}

/** Myntra embeds the whole product (gallery, colour, sizes, ratings) in window.__myx on the page. */
function extractMyntraPdp(html: string): Json | null {
  const match = html.match(/window\.__myx\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/)
  if (!match) return null
  try {
    return (JSON.parse(match[1]) as Json).pdpData ?? null
  } catch {
    return null
  }
}

function myntraImages(pdp: Json): string[] {
  const albums = asArray<Json>(pdp.media?.albums)
  return albums
    .flatMap((album) => asArray<Json>(album.images))
    .map((img) => {
      const src = text(img.secureSrc) || text(img.src)
      if (!src) return text(img.imageURL).replace(/^http:/, "https:")
      return src
        .replace("($height)", "1440")
        .replace("($qualityPercentage)", "100")
        .replace("($width)", "1080")
        .replace(/^http:/, "https:")
    })
    .filter(Boolean)
}

const MEASUREMENT_KEYS: Array<[RegExp, string, string]> = [
  [/inseam/, "inseam", "Inseam"],
  [/outseam/, "outseam", "Outseam"],
  [/sleeve/, "sleeve", "Sleeve length"],
  [/rise/, "rise", "Rise"],
  [/waist/, "waist", "Waist"],
  [/chest|bust/, "chest", "Chest"],
  [/hip/, "hips", "Hips"],
  [/shoulder/, "shoulders", "Shoulders"],
  [/neck|collar/, "neck", "Neck"],
  [/length/, "length", "Length"],
]

function makeReading(name: string, cm: number): MeasurementReading {
  const known = MEASUREMENT_KEYS.find(([re]) => re.test(name.toLowerCase()))
  return {
    key: known ? known[1] : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other",
    label: known ? known[2] : name,
    cm: Math.round(cm * 10) / 10,
  }
}

function readingFrom(m: Json): MeasurementReading | null {
  const raw = Number.parseFloat(text(m.value))
  if (!Number.isFinite(raw) || raw <= 0) return null
  return makeReading(text(m.name), /inch|^in$/i.test(text(m.unit)) ? raw * 2.54 : raw)
}

/** "38" -> 38, "28.5-30" -> 29.25 (midpoint of a range), anything else -> null */
function parseMeasure(value: unknown): number | null {
  const v = text(value).replace(/,/g, "")
  const range = v.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)$/)
  if (range) return (Number(range[1]) + Number(range[2])) / 2
  const single = v.match(/^(\d+(?:\.\d+)?)$/)
  return single ? Number(single[1]) : null
}

/** Reads a JSON object assigned in an inline script (window.__X__ = {...}) by matching braces. */
function extractWindowJson(html: string, name: string): Json | null {
  const marker = html.indexOf(name)
  if (marker === -1) return null
  const start = html.indexOf("{", marker)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === "\\") escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === "{") depth++
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

/** Flipkart embeds the whole page state as window.__INITIAL_STATE__ */
const extractFlipkartState = (html: string) => extractWindowJson(html, "window.__INITIAL_STATE__")

const titleCase = (value: string) => value.toLowerCase().replace(/(^|[\s,/-])(\w)/g, (_m, sep: string, c: string) => sep + c.toUpperCase())

/** Size and colour swatches (and the MRP) from Flipkart's page state. */
function flipkartDetails(state: Json): { sizes: Array<{ size: string; available: boolean }>; colors: string[]; mrp?: number } {
  const sizes = new Map<string, boolean>()
  const colors: string[] = []

  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 40) return
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, depth + 1))
      return
    }
    const o = node as Json
    const title = text(o.contentTitle)
    // widgetTitle "Variant" entries are the same swatches again, as links
    if (title && text(o.widgetTitle) !== "Variant") {
      if (o.viewType === "ATLAS_SWATCH_ATTRIBUTE") sizes.set(title, text(o.contentType).startsWith("InStock"))
      else if (o.viewType === "ATLAS_SWATCH_IMAGE") colors.push(titleCase(title))
    }
    Object.values(o).forEach((v) => walk(v, depth + 1))
  }
  walk(state.multiWidgetState?.widgetsData ?? state, 0)

  const ppd = state.multiWidgetState?.pageDataResponse?.pageContext?.fdpEventTracking?.events?.psi?.ppd
  const mrp = typeof ppd?.mrp === "number" && ppd.mrp > 0 ? ppd.mrp : undefined
  return { sizes: Array.from(sizes, ([size, available]) => ({ size, available })), colors: Array.from(new Set(colors)), mrp }
}

interface ChartDetails {
  images: string[]
  sizes: Array<{ size: string; available: boolean }>
  colors: string[]
  color?: string
  mrp?: number
  chart: SizeChartRow[]
}

/** Ajio embeds its page state as window.__PRELOADED_STATE__; the product is under product.productDetails. */
function ajioDetails(html: string): ChartDetails | null {
  const state = extractWindowJson(html, "window.__PRELOADED_STATE__")
  const pd = state?.product?.productDetails as Json | undefined
  if (!pd) return null

  const images = asArray<Json>(pd.images)
  const ofFormat = (format: string) =>
    images
      .filter((i) => i.format === format && text(i.url))
      .sort((a, b) => Number(a.galleryIndex) - Number(b.galleryIndex))
      .map((i) => text(i.url))
  const photos = ofFormat("superZoomPdp").length ? ofFormat("superZoomPdp") : ofFormat("product")

  const sizes = asArray<Json>(pd.variantOptions)
    .map((v) => ({ size: text(v.scDisplaySize), available: v.stock?.stockLevelStatus === "inStock" && Number(v.stock?.stockLevel ?? 1) > 0 }))
    .filter((v) => v.size)
  const colors = asArray<Json>(pd.baseOptions?.[0]?.options).map((o) => titleCase(text(o.color))).filter(Boolean)
  const price = Number(pd.price?.value)
  const was = Number(pd.wasPriceData?.value)

  // Size guide: a JSON string with one table per measurement type ("Body Measurement", ...)
  const rows = new Map<string, SizeChartRow>()
  try {
    const guide = JSON.parse(text(pd.fnlColorVariantData?.sizeGuideDesktop) || "{}") as Json
    for (const table of asArray<Json>(guide.sizechart)) {
      const kind = /body/i.test(text(table.measurementType)) ? "body" : "garment"
      for (const sz of asArray<Json>(table.brickBrandSizes)) {
        const label = text(sz.sizeName)
        if (!label) continue
        const row = rows.get(label) ?? { size: label, available: sizes.find((s) => s.size === label)?.available ?? true, body: [], garment: [] }
        for (const attr of asArray<Json>(sz.sizeChartAttributes)) {
          const name = text(attr.attributeName).replace(/_attribute$/i, "")
          if (!name || /size|format|gender/i.test(name)) continue
          // the converted value is already in cm; fall back to the listed value (inches)
          const cm = parseMeasure(attr.convertedAttributeValue) ?? (parseMeasure(attr.attributeValue) ?? NaN) * 2.54
          if (Number.isFinite(cm) && cm > 0) row[kind].push(makeReading(name, cm))
        }
        rows.set(label, row)
      }
    }
  } catch {
    // no readable size guide
  }

  return {
    images: photos,
    sizes,
    colors,
    color: titleCase(text(pd.fnlColorVariantData?.color)) || undefined,
    mrp: Number.isFinite(was) && Number.isFinite(price) && was > price ? was : undefined,
    chart: Array.from(rows.values()).filter((r) => r.body.length || r.garment.length),
  }
}

/** Amazon lists a product's size and colour options in "variationValues", and often a size chart table in the page. */
function amazonVariations(html: string): { sizes: string[]; colors: string[]; selectedColor?: string } {
  const read = (re: RegExp): Json | null => {
    const m = html.match(re)
    if (!m) return null
    try {
      return JSON.parse(m[1]) as Json
    } catch {
      return null
    }
  }
  const values = read(/"variationValues"\s*:\s*(\{[^{}]*\})/)
  const selected = read(/"selectedVariationValues"\s*:\s*(\{[^{}]*\})/)
  const sizes = asArray<unknown>(values?.size_name).map(text).filter(Boolean)
  const rawColors = asArray<unknown>(values?.color_name).map(text).filter(Boolean)
  const pretty = (c: string) => (c === c.toUpperCase() ? titleCase(c) : c)
  const idx = Number(selected?.color_name)
  return {
    sizes,
    colors: rawColors.map(pretty),
    selectedColor: Number.isInteger(idx) && rawColors[idx] ? pretty(rawColors[idx]) : undefined,
  }
}

function amazonSizeChart($: cheerio.CheerioAPI, sizes: string[]): SizeChartRow[] {
  const table = $('[id^="fit-sizechartv2-"] table').first()
  if (!table.length) return []

  const headers = table.find("tr").first().children().map((_, c) => $(c).text().replace(/\s+/g, " ").trim()).get()
  const caption = `${table.closest('[id^="fit-sizechartv2-"]').find("h5").first().text()} ${headers.join(" ")}`
  // Unless the chart says it is a body measurement, treat it as the garment's own (safer: never fills body measurements)
  const kind = /body|to fit/i.test(caption) ? "body" : "garment"

  const rows: SizeChartRow[] = []
  table.find("tr").slice(1).each((_, tr) => {
    const cells = $(tr).children().map((_i, c) => $(c).text().replace(/\s+/g, " ").trim()).get()
    const label = cells[0]
    if (!label) return
    const row: SizeChartRow = { size: label, available: sizes.length ? sizes.includes(label) : true, body: [], garment: [] }
    headers.forEach((header, i) => {
      const m = header.match(/^(.*?)\s*\((in|inch|inches|cm)\)\s*$/i)
      if (!m) return // only columns that state their unit
      const value = parseMeasure(cells[i])
      if (value && value > 0) row[kind].push(makeReading(m[1], /^cm$/i.test(m[2]) ? value : value * 2.54))
    })
    if (row.body.length || row.garment.length) rows.push(row)
  })
  return rows
}

/** Myntra lists, per size, BODY (to-fit) and GARMENT measurements. */
function myntraSizeChart(pdp: Json): SizeChartRow[] {
  return asArray<Json>(pdp.sizes)
    .map((sz) => {
      const readings = asArray<Json>(sz.measurements)
      const pick = (type: string) =>
        readings
          .filter((m) => text(m.type).toUpperCase() === type)
          .map(readingFrom)
          .filter((r): r is MeasurementReading => r !== null)
      return { size: text(sz.label), available: Boolean(sz.available), body: pick("BODY"), garment: pick("GARMENT") }
    })
    .filter((row) => row.size && (row.body.length > 0 || row.garment.length > 0))
}

/** Amazon keeps every gallery photo (with hi-res links) in an inline "colorImages" script object. */
function amazonGalleryImages(html: string): string[] {
  const match = html.match(/'colorImages'\s*:\s*\{\s*'initial'\s*:\s*(\[[\s\S]*?\])\s*\}\s*,\s*'colorToAsin'/) ??
    html.match(/"colorImages"\s*:\s*\{\s*"initial"\s*:\s*(\[[\s\S]*?\])\s*\}/)
  if (!match) return []
  try {
    return (JSON.parse(match[1]) as Json[]).map((i) => text(i.hiRes) || text(i.large)).filter(Boolean)
  } catch {
    return []
  }
}

export function parseProductHtml(html: string, url: string, platform: ShoppingPlatform): ScrapedProduct {
  const $ = cheerio.load(html)
  const meta = (...selectors: string[]) => {
    for (const s of selectors) {
      const v = $(s).attr("content")?.trim()
      if (v) return v
    }
    return ""
  }

  const ld = findProductJsonLd($)
  const offer = ld ? pickOffer(ld) : null
  const myntra = platform === "myntra" ? extractMyntraPdp(html) : null
  const flipkart = platform === "flipkart" ? extractFlipkartState(html) : null
  const flipkartInfo = flipkart ? flipkartDetails(flipkart) : null
  const ajio = platform === "ajio" ? ajioDetails(html) : null
  const amazon = platform === "amazon" ? amazonVariations(html) : null

  // ── Name ──
  let name = (ld && text(ld.name)) || meta('meta[property="og:title"]', 'meta[name="twitter:title"]')
  if (platform === "amazon") name = $("#productTitle").text().trim() || name
  if (!name) name = $("h1").first().text().trim() || $("title").first().text().trim()

  // ── Brand ──
  let brand = (ld && text(ld.brand)) || meta('meta[property="product:brand"]')
  if (!brand && platform === "amazon") {
    brand = brandFromAmazonByline($("#bylineInfo").text().trim() || $("#brand").text().trim())
  }
  if (!brand && platform === "myntra") brand = $(".pdp-title").first().text().trim()

  // ── Price ──
  let price = parsePrice(offer?.price ?? offer?.lowPrice) || parsePrice(meta('meta[property="product:price:amount"]', 'meta[property="og:price:amount"]'))
  let original = ""
  let discount = ""
  if (platform === "amazon") {
    // Amazon renders several price blocks (some with an empty hidden .a-offscreen), so take the first one with a value,
    // looking only inside the main price area to avoid picking up prices from carousels further down the page.
    const firstPrice = (selector: string) => {
      let found = ""
      $(selector).each((_, el) => {
        const parsed = parsePrice($(el).text())
        if (parsed) {
          found = parsed
          return false
        }
      })
      return found
    }
    price =
      firstPrice(".priceToPay .a-offscreen") ||
      firstPrice(".apex-pricetopay-value .a-offscreen") ||
      firstPrice("#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen") ||
      parsePrice(`${$(".priceToPay .a-price-whole").first().text().replace(/[^\d,]/g, "")}`) ||
      price
    original = firstPrice(".basisPrice .a-offscreen") || firstPrice(".a-text-price .a-offscreen")
    discount = $(".savingsPercentage").first().text().trim().replace(/^-/, "") // "-85%" → "85%"
  }
  if (platform === "flipkart" && !price) {
    price = parsePrice($("div.Nx9bqj, div.hZ3P6w").first().text())
    original = parsePrice($("div.yRaY8j, div.kRYCnD").first().text())
    discount = $("div.UkUFwK span, div.HQe8jr span").first().text().trim()
  }
  if (platform === "myntra" && !price) {
    price = parsePrice($(".pdp-price strong").first().text())
    original = parsePrice($(".pdp-mrp s").first().text())
  }
  if (original && price && !discount) {
    const pct = Math.round((1 - Number(price) / Number(original)) * 100)
    if (pct > 0 && pct < 100) discount = `${pct}% off`
  }
  if (original && Number(original) <= Number(price)) original = ""

  // ── Images ──
  const candidates: Array<string | null> = []
  // A site-specific gallery is the full set of photos; the generic tags below would only add thumbnails of the same shots
  const gallery = myntra ? myntraImages(myntra) : ajio?.images.length ? ajio.images : platform === "amazon" ? amazonGalleryImages(html).map((i) => absolutize(i, url)) : []
  gallery.forEach((i) => candidates.push(i))
  if (!gallery.length) {
    if (ld) asArray<unknown>(ld.image).forEach((i) => candidates.push(absolutize(typeof i === "string" ? i : (i as Json)?.url, url)))
    if (platform === "amazon") {
      const dynamic = $("#landingImage, #imgBlkFront").attr("data-a-dynamic-image")
      if (dynamic) {
        try {
          const sizes = JSON.parse(dynamic) as Record<string, [number, number]>
          Object.entries(sizes)
            .sort((a, b) => b[1][0] * b[1][1] - a[1][0] * a[1][1])
            .forEach(([src]) => candidates.push(absolutize(src, url)))
        } catch {
          // ignore malformed attribute
        }
      }
      $("#altImages img").each((_, img) => {
        candidates.push(absolutize($(img).attr("src"), url))
      })
    }
    candidates.push(absolutize(meta('meta[property="og:image"]', 'meta[property="og:image:secure_url"]', 'meta[name="twitter:image"]'), url))
  }
  const images = dedupe(candidates.map((c) => (c ? upgradeImageUrl(c) : c)))

  // ── Description / features ──
  let description = (ld && cleanHtmlText(text(ld.description))) || meta('meta[property="og:description"]', 'meta[name="description"]')
  const features: string[] = []
  if (platform === "amazon") {
    $("#feature-bullets li span.a-list-item").each((_, li) => {
      const t = $(li).text().trim()
      if (t && features.length < 8) features.push(t)
    })
    if (!description && features.length) description = features.join(" • ")
  }

  if (ajio?.mrp && price && ajio.mrp > Number(price)) {
    original = String(ajio.mrp)
    const pct = Math.round((1 - Number(price) / ajio.mrp) * 100)
    if (pct > 0 && pct < 100) discount = `${pct}% off`
  }

  if (flipkartInfo?.mrp && price && flipkartInfo.mrp > Number(price)) {
    original = String(flipkartInfo.mrp)
    const pct = Math.round((1 - Number(price) / flipkartInfo.mrp) * 100)
    if (pct > 0 && pct < 100) discount = `${pct}% off`
  }

  if (myntra) {
    const details = asArray<Json>(myntra.productDetails)
      .map((d) => cleanHtmlText(text(d.description).replace(/<\/li>|<br\s*\/?>/gi, ". ")))
      .filter(Boolean)
    if (details.length) description = details.join(" ")
    if (myntra.price?.mrp && myntra.price?.discounted) {
      price = parsePrice(myntra.price.discounted) || price
      original = parsePrice(myntra.price.mrp)
      const pct = original ? Math.round((1 - Number(price) / Number(original)) * 100) : 0
      if (pct > 0 && pct < 100) discount = `${pct}% off`
    }
  }

  // ── Rating ──
  const aggregate = (ld?.aggregateRating ?? {}) as Json
  let rating = text(aggregate.ratingValue) || ($("#acrCustomerReviewText").length ? $("span.a-icon-alt").first().text().split(" ")[0] : "")
  let reviews = text(aggregate.reviewCount ?? aggregate.ratingCount)
  if (myntra?.ratings?.averageRating) {
    rating = (Math.round(Number(myntra.ratings.averageRating) * 10) / 10).toString()
    reviews = text(myntra.ratings.totalCount)
  }

  // ── Colour / size ──
  let color = (ld && text(ld.color)) || ""
  const colors: string[] = []
  // schema.org variants: each lists its own colour / size
  const variants = ld ? asArray<Json>(ld.hasVariant) : []
  variants.forEach((v) => {
    if (text(v.color)) colors.push(text(v.color))
  })
  if (platform === "amazon") {
    const colorMap = html.match(/'colorToAsin'\s*:\s*(\{[\s\S]*?\})\s*,\s*'/) ?? html.match(/"colorToAsin"\s*:\s*(\{[\s\S]*?\})\s*,\s*"/)
    if (colorMap) {
      try {
        Object.keys(JSON.parse(colorMap[1])).forEach((name) => colors.push(name))
      } catch {
        // ignore malformed script data
      }
    }
  }
  const sizeRaw = ld?.size ?? ""
  let size: string[] | string = Array.isArray(sizeRaw) ? sizeRaw.map(text).filter(Boolean) : text(sizeRaw)
  if (myntra) {
    color = text(myntra.baseColour) || color
    asArray<Json>(myntra.colours).forEach((c) => colors.push(text(c.label)))
    if (color) colors.push(color)
    const inStock = asArray<Json>(myntra.sizes).filter((sz) => sz.available).map((sz) => text(sz.label)).filter(Boolean)
    if (inStock.length) size = inStock
  }
  if (ajio) {
    ajio.colors.forEach((c) => colors.push(c))
    if (ajio.color) {
      color = color || ajio.color
      colors.push(ajio.color)
    }
    const inStock = ajio.sizes.filter((sz) => sz.available).map((sz) => sz.size)
    if (inStock.length) size = inStock
  }
  if (amazon) {
    amazon.colors.forEach((c) => colors.push(c))
    if (amazon.selectedColor) color = color || amazon.selectedColor
    if (amazon.sizes.length) size = amazon.sizes
  }
  if (flipkartInfo) {
    flipkartInfo.colors.forEach((c) => colors.push(c))
    if (color) colors.push(titleCase(color))
    const inStock = flipkartInfo.sizes.filter((sz) => sz.available).map((sz) => sz.size)
    if (inStock.length) size = inStock
  }

  const categoryHint = `${name} ${text(ld?.category)} ${$("title").first().text()} ${$("#wayfinding-breadcrumbs_feature_div").text()}`
  const currency = text(offer?.priceCurrency) || meta('meta[property="product:price:currency"]') || "INR"

  if (!name || (!images.length && !price)) {
    throw new ProductScrapeError(
      "Couldn't read product details from this page. The shop may have blocked the request — try again, or fill in the details manually."
    )
  }

  return {
    product_name: name,
    brand,
    category: deriveCategory(categoryHint),
    price: {
      current: price,
      original: original || undefined,
      discount: discount || undefined,
    },
    currency,
    color,
    colors: colors.length ? Array.from(new Set(colors.filter(Boolean))) : undefined,
    sizeChart: myntra
      ? myntraSizeChart(myntra)
      : ajio
        ? ajio.chart
        : amazon
          ? amazonSizeChart($, amazon.sizes)
          : undefined,
    size,
    rating: rating || undefined,
    reviews_count: reviews || undefined,
    description,
    features: features.length ? features : undefined,
    images,
    buying_link: url,
    platform,
  }
}

export async function scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
  const requested = rawUrl.trim()
  assertAllowedUrl(requested)
  const trimmed = await resolveShareLink(requested)
  const platform = assertAllowedUrl(trimmed)

  // 1) Own server first: real browser on a home IP gets through where plain requests are blocked
  const rendered = await fetchViaRenderService(trimmed)
  if (rendered) {
    try {
      return parseProductHtml(rendered.html, rendered.finalUrl, platform)
    } catch (error) {
      if (!(error instanceof ProductScrapeError)) throw error
      // unreadable page — carry on with the other methods
    }
  }

  // 2) Plain fetch, 3) ScraperAPI
  let html = ""
  let finalUrl = trimmed
  let blocked = false

  try {
    const direct = await fetchDirect(trimmed)
    html = direct.html
    finalUrl = direct.finalUrl
    blocked = direct.blocked
  } catch (error) {
    if (error instanceof ProductScrapeError) throw error
    console.error("[ProductScraper] Direct fetch failed:", error)
    blocked = true
  }

  if (!blocked) {
    try {
      return parseProductHtml(html, finalUrl, platform)
    } catch (error) {
      // JS-rendered page with no usable markup — let the fallback provider try
      if (!(error instanceof ProductScrapeError) || !process.env.SCRAPER_API_KEY) throw error
    }
  }

  const fallbackHtml = await fetchViaScraperApi(finalUrl, platform)
  if (fallbackHtml) return parseProductHtml(fallbackHtml, finalUrl, platform)

  throw new ProductScrapeError(
    `${platform[0].toUpperCase()}${platform.slice(1)} blocked the request. Try again in a moment, or fill in the details manually.`,
    422
  )
}
