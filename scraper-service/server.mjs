import http from "node:http"
import crypto from "node:crypto"
import { chromium } from "patchright"
import { rmSync } from "node:fs"

// A stray rejection from the browser library (e.g. "Frame was detached" after a page closes) must not kill the service
process.on("unhandledRejection", (error) => console.error("[scraper-service] unhandled rejection:", error?.message ?? error))
process.on("uncaughtException", (error) => console.error("[scraper-service] uncaught exception:", error?.message ?? error))

const PORT = Number(process.env.PORT ?? 3001)
const API_KEY = process.env.SCRAPER_SERVICE_KEY ?? ""
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT ?? 2)
const MAX_QUEUE = Number(process.env.MAX_QUEUE ?? 10)
const NAV_TIMEOUT_MS = 30000
const MAX_HTML_CHARS = 3 * 1024 * 1024

if (API_KEY.length < 16) {
  console.error("SCRAPER_SERVICE_KEY must be set to a random string of at least 16 characters")
  process.exit(1)
}

// Same shopping hosts the Aura360 app accepts. Re-checked on every navigation (including redirects).
const ALLOWED_HOSTS = [
  /(^|\.)(amazon\.[a-z.]+|amzn\.(in|to|com|eu)|a\.co)$/,
  /(^|\.)(flipkart\.com|fkrt\.(it|cc))$/,
  /(^|\.)myntra\.com$/,
  /(^|\.)meesho\.com$/,
  /(^|\.)(ajio\.com|ajiio\.in)$/,
]

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw)
    if (u.protocol !== "https:" && u.protocol !== "http:") return false
    if (u.username || u.password) return false
    const host = u.hostname.toLowerCase()
    return ALLOWED_HOSTS.some((re) => re.test(host))
  } catch {
    return false
  }
}

// One persistent browser profile shared by every request. The shops' bot protection (Akamai) scores the whole
// session, so a profile that has already loaded a few pages, with its cookies, passes where a brand-new
// browser is refused. Patchright is a patched Playwright that removes the usual automation giveaways.
const PROFILE_DIR = process.env.PROFILE_DIR || "/tmp/aura360-scraper-profile"

let contextPromise = null
function getContext() {
  if (!contextPromise) {
    // a restarted container keeps its filesystem; drop a stale profile lock / old session
    rmSync(PROFILE_DIR, { recursive: true, force: true })
    contextPromise = chromium
      .launchPersistentContext(PROFILE_DIR, {
        // Ajio blocks invisible (headless) browsers but accepts a normal window, so run headful by default.
        // In Docker this runs inside a virtual display (see start.sh). Set HEADFUL=0 to go back to headless.
        headless: process.env.HEADFUL === "0",
        // BROWSER_CHANNEL=chrome uses real Google Chrome (installed in the Dockerfile); msedge works for local testing
        ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
        viewport: null, // real window size, as patchright recommends
        locale: "en-IN",
        timezoneId: "Asia/Kolkata",
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      })
      .then((context) => {
        context.on("close", () => {
          contextPromise = null
          warmedAt.clear()
        })
        return context
      })
      .catch((error) => {
        contextPromise = null
        throw error
      })
  }
  return contextPromise
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Simple concurrency gate so a burst of requests cannot exhaust the laptop.
let active = 0
const waiting = []
function acquire() {
  if (active < MAX_CONCURRENT) {
    active++
    return Promise.resolve()
  }
  if (waiting.length >= MAX_QUEUE) return Promise.reject(new HttpError(429, "Scraper is busy, try again shortly"))
  return new Promise((resolve) => waiting.push(resolve))
}
function release() {
  const next = waiting.shift()
  if (next) next()
  else active--
}

// hostname -> time we last loaded that site's home page in this profile
const warmedAt = new Map()
const WARM_TTL_MS = 20 * 60 * 1000
// hostname -> time until which we will not touch that site again (it refused this connection)
const blockedUntil = new Map()
const IP_BLOCK_COOLDOWN_MS = Number(process.env.BLOCK_COOLDOWN_MIN ?? 15) * 60 * 1000
const PAGE_BLOCK_COOLDOWN_MS = 2 * 60 * 1000
const MAX_ATTEMPTS = 3

// The shops answer a refused request with a tiny "Access Denied" / robot-check page instead of the product
function looksDenied(html) {
  if (html.length > 20000) return false
  return /access denied|robot check|captcha|are you a human|reference #\d/i.test(html)
}

// How long to dwell on a site's home page so its bot-check script can validate the session
const WARM_MS = Number(process.env.WARM_MS ?? 6000)

async function humanPause(page) {
  try {
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(220 + i * 160, 260 + (i % 2) * 110, { steps: 10 })
      await page.mouse.wheel(0, 320)
      await page.waitForTimeout(450)
    }
  } catch {
    // purely cosmetic
  }
}

// Load the site's home page and behave like a visitor for a few seconds. Cookies from this visit are what
// make the following product-page request look normal to the shop's bot protection.
async function warm(page, host) {
  await page.goto(`https://${host}/`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {})
  const until = Date.now() + WARM_MS
  while (Date.now() < until) await humanPause(page)
  const denied = looksDenied(await page.content().catch(() => ""))
  if (!denied) warmedAt.set(host.replace(/^www\./, ""), Date.now())
  return denied // true = even the home page was refused, i.e. this connection is blocked by the shop right now
}

async function render(url) {
  const started = Date.now()
  const host = new URL(url).hostname.toLowerCase()
  const siteKey = host.replace(/^www\./, "")

  const cooldown = blockedUntil.get(siteKey)
  if (cooldown && cooldown > Date.now()) {
    const minutes = Math.ceil((cooldown - Date.now()) / 60000)
    console.log(`[render] ${host} skipped: refused this connection recently, retrying in ~${minutes} min`)
    return { html: "", finalUrl: url, status: 0, blocked: true, reason: "cooldown" }
  }

  const context = await getContext()
  const page = await context.newPage()

  try {
    await page.route("**/*", (route) => {
      const request = route.request()
      // Never follow a page navigation (e.g. a redirect) to a non-shopping host
      if (request.isNavigationRequest() && request.frame() === page.mainFrame() && !isAllowedUrl(request.url())) {
        return route.abort()
      }
      // We only need the markup, so skip video and fonts. Images are left alone: a page that loads none looks like a bot.
      const type = request.resourceType()
      if (type === "media" || type === "font") return route.abort()
      return route.continue()
    })

    // Warm the session on the site's home page first, unless this profile has recently done so
    if (!warmedAt.has(siteKey) || Date.now() - warmedAt.get(siteKey) > WARM_TTL_MS) {
      if (await warm(page, host)) {
        blockedUntil.set(siteKey, Date.now() + IP_BLOCK_COOLDOWN_MS)
        console.log(`[render] ${host} home page refused (connection blocked by the shop); pausing this site for ${IP_BLOCK_COOLDOWN_MS / 60000} min`)
        return { html: "", finalUrl: url, status: 0, blocked: true, reason: "ip-blocked" }
      }
    }

    let html = ""
    let status = 0
    let attempts = 0
    for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS })
      status = response?.status() ?? 0

      // Give client-rendered shops a moment to inject their product markup
      await page
        .waitForSelector('#productTitle, script[type="application/ld+json"], h1', { state: "attached", timeout: 8000 })
        .catch(() => {})
      await page.waitForTimeout(1200)

      const finalUrl = page.url()
      if (!isAllowedUrl(finalUrl)) throw new HttpError(422, "Page redirected to an unsupported site")

      html = (await page.content()).slice(0, MAX_HTML_CHARS)
      if (!looksDenied(html)) break

      // Refused: spend more time as a normal visitor on the home page, then ask again
      if (attempts < MAX_ATTEMPTS && (await warm(page, host))) {
        blockedUntil.set(siteKey, Date.now() + IP_BLOCK_COOLDOWN_MS)
        break
      }
    }

    const ok = !looksDenied(html)
    if (!ok && !blockedUntil.has(siteKey)) blockedUntil.set(siteKey, Date.now() + PAGE_BLOCK_COOLDOWN_MS)
    console.log(
      `[render] ${host} status=${status} len=${html.length} attempts=${Math.min(attempts, MAX_ATTEMPTS)} ok=${ok} ms=${Date.now() - started}`
    )
    return { html, finalUrl: page.url(), status, blocked: !ok }
  } finally {
    await page.close().catch(() => {})
  }
}

function keyMatches(provided) {
  const a = crypto.createHash("sha256").update(provided).digest()
  const b = crypto.createHash("sha256").update(API_KEY).digest()
  return crypto.timingSafeEqual(a, b)
}

function send(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) })
  res.end(payload)
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > 10_000) throw new HttpError(413, "Request too large")
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"))
  } catch {
    throw new HttpError(400, "Invalid JSON body")
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, active, queued: waiting.length })
    }

    if (req.method === "POST" && req.url === "/render") {
      const provided = req.headers["x-api-key"]
      if (typeof provided !== "string" || !keyMatches(provided)) throw new HttpError(401, "Unauthorized")

      const { url } = await readJson(req)
      if (typeof url !== "string" || !isAllowedUrl(url)) {
        throw new HttpError(400, "Unsupported URL. Only Amazon, Flipkart, Myntra, Meesho and Ajio links are allowed")
      }

      await acquire()
      try {
        return send(res, 200, await render(url))
      } finally {
        release()
      }
    }

    throw new HttpError(404, "Not found")
  } catch (error) {
    if (error instanceof HttpError) return send(res, error.status, { error: error.message })
    console.error("[scraper-service] error:", error?.message ?? error)
    return send(res, 502, { error: "Failed to load the page" })
  }
})

server.listen(PORT, () => {
  console.log(`[scraper-service] listening on :${PORT}`)
  // Off by default: every start-up (and every redeploy) would otherwise load two shop home pages. Set PREWARM=1 to
  // trade that traffic for a faster first request.
  if (process.env.PREWARM === "1") void prewarm()
})

// Warm the browser profile in the background, so the first real request is not the slow, most-likely-refused one
async function prewarm() {
  try {
    const context = await getContext()
    for (const host of ["www.ajio.com", "www.meesho.com"]) {
      const page = await context.newPage()
      try {
        if (await warm(page, host)) {
          blockedUntil.set(host.replace(/^www\./, ""), Date.now() + IP_BLOCK_COOLDOWN_MS)
          console.log(`[scraper-service] ${host} refused the warm-up visit; pausing this site for ${IP_BLOCK_COOLDOWN_MS / 60000} min`)
        }
      } finally {
        await page.close().catch(() => {})
      }
    }
    console.log("[scraper-service] browser profile warmed")
  } catch (error) {
    console.error("[scraper-service] warm-up skipped:", error?.message ?? error)
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close()
    const context = await contextPromise?.catch(() => null)
    await context?.close().catch(() => {})
    process.exit(0)
  })
}
