import http from "node:http"
import crypto from "node:crypto"
import { chromium } from "playwright"

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

// Same user agent that passed the Amazon check in the manual Playwright test
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"

let browserPromise = null
function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        // Ajio blocks invisible (headless) browsers but accepts a normal window, so run headful by default.
        // In Docker this runs inside a virtual display (xvfb-run). Set HEADFUL=0 to go back to headless.
        headless: process.env.HEADFUL === "0",
        // BROWSER_CHANNEL=chrome uses real Google Chrome instead of the bundled Chromium (installed in the Dockerfile)
        ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
      })
      .then((browser) => {
        browser.on("disconnected", () => {
          browserPromise = null
        })
        return browser
      })
      .catch((error) => {
        browserPromise = null
        throw error
      })
  }
  return browserPromise
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

async function render(url) {
  const browser = await getBrowser()
  const context = await browser.newContext({
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 768 },
  })

  try {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined })
    })

    const page = await context.newPage()

    await page.route("**/*", (route) => {
      const request = route.request()
      // Never follow a page navigation (e.g. a redirect) to a non-shopping host
      if (request.isNavigationRequest() && request.frame() === page.mainFrame() && !isAllowedUrl(request.url())) {
        return route.abort()
      }
      // We only need the markup, so skip heavy assets
      const type = request.resourceType()
      if (type === "image" || type === "media" || type === "font") return route.abort()
      return route.continue()
    })

    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS })

    // Give client-rendered shops a moment to inject their product markup
    await page
      .waitForSelector('#productTitle, script[type="application/ld+json"], h1', { state: "attached", timeout: 8000 })
      .catch(() => {})
    await page.waitForTimeout(1200)

    const finalUrl = page.url()
    if (!isAllowedUrl(finalUrl)) throw new HttpError(422, "Page redirected to an unsupported site")

    const html = (await page.content()).slice(0, MAX_HTML_CHARS)
    return { html, finalUrl, status: response?.status() ?? 0 }
  } finally {
    await context.close().catch(() => {})
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

server.listen(PORT, () => console.log(`[scraper-service] listening on :${PORT}`))

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close()
    const browser = await browserPromise?.catch(() => null)
    await browser?.close().catch(() => {})
    process.exit(0)
  })
}
