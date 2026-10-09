/* Aura360 service worker
 *
 * 1. App shell: hashed build assets are cached, so the app opens offline.
 * 2. Recently opened pages and API data are cached PER USER (named by user id) and wiped on sign-out, so a shared device
 *    never shows another person's data. They are only used when the network fails.
 * 3. Offline logging: creating an expense, workout, meal, time log, note or skincare product while offline is saved in
 *    IndexedDB and sent automatically when the connection is back. The page gets an immediate "saved offline" reply.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v1"
const STATIC_CACHE = `aura-static-${VERSION}`
const USER_PREFIX = "aura-user-"
const OFFLINE_URL = "/offline.html"
const PRECACHE = [OFFLINE_URL, "/favicon.png", "/manifest.json"]

/** Creating one of these offline is queued. Exact paths only (no /bulk, /batch or ?id= edits and deletes). */
const QUEUEABLE = new Set(["/api/finance/transactions", "/api/fitness", "/api/food", "/api/time", "/api/notes", "/api/skincare"])
/** GET responses worth keeping so the pages can show the last data you saw. */
const CACHEABLE_API = [
  /^\/api\/finance\/(transactions|budgets|balances|goals|subscriptions)$/,
  /^\/api\/(fitness|food|time|notes|skincare|saved|fashion|fashion\/outfits)$/,
]
const MAX_BODY_BYTES = 256 * 1024
const MAX_ATTEMPTS = 10
const NETWORK_TIMEOUT_MS = 4000
const LIMITS = { pages: 40, rsc: 60, api: 80 }

// ── IndexedDB (queue, failed, meta) ───────────────────────────────────────────

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("aura-offline", 1)
    req.onupgradeneeded = () => {
      const db = req.result
      db.createObjectStore("queue", { keyPath: "id", autoIncrement: true })
      db.createObjectStore("failed", { keyPath: "id", autoIncrement: true })
      db.createObjectStore("meta")
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(name, mode, run) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode)
      const result = run(tx.objectStore(name))
      tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

const dbAll = (store) => withStore(store, "readonly", (s) => s.getAll())
const dbPut = (store, value, key) => withStore(store, "readwrite", (s) => (key === undefined ? s.put(value) : s.put(value, key)))
const dbDelete = (store, key) => withStore(store, "readwrite", (s) => s.delete(key))
const dbGet = (store, key) => withStore(store, "readonly", (s) => s.get(key))

async function currentUser() {
  return (await dbGet("meta", "user").catch(() => null)) || null
}

// ── Messaging to the open pages ───────────────────────────────────────────────

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" })
  clients.forEach((client) => client.postMessage(message))
}

async function snapshot() {
  const user = await currentUser()
  const [queue, failed] = await Promise.all([dbAll("queue"), dbAll("failed")])
  const mine = (item) => user && item.userId === user
  const pick = (kind) => (item) => ({ id: item.id, kind, label: item.label, createdAt: item.createdAt, error: item.error })
  return {
    type: "status",
    pending: queue.filter(mine).length,
    failed: failed.filter(mine).length,
    items: [...queue.filter(mine).map(pick("pending")), ...failed.filter(mine).map(pick("failed"))],
  }
}

// ── Offline queue ─────────────────────────────────────────────────────────────

function labelFor(path, body) {
  const b = body || {}
  switch (path) {
    case "/api/finance/transactions":
      return `${b.type === "income" ? "Income" : "Expense"} ₹${b.amount ?? ""}${b.category ? ` · ${b.category}` : ""}`.trim()
    case "/api/fitness":
      return `Workout${b.workoutType || b.type ? `: ${b.workoutType || b.type}` : ""}`
    case "/api/food":
      return `Meal: ${b.foodName ?? "entry"}`
    case "/api/time":
      return `Time log: ${b.activity ?? "entry"}`
    case "/api/notes":
      return `Note: ${b.title ?? "untitled"}`
    case "/api/skincare":
      return `Skincare product: ${b.productName ?? "entry"}`
    default:
      return "Entry"
  }
}

async function queueRequest(request) {
  const user = await currentUser()
  const contentType = request.headers.get("content-type") || ""
  if (!user || !contentType.includes("application/json")) return Response.error() // can't queue safely: behave as before

  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return Response.error()

  let body
  try {
    body = JSON.parse(text)
  } catch {
    return Response.error()
  }

  const url = new URL(request.url)
  const label = labelFor(url.pathname, body)
  await dbPut("queue", { url: url.pathname + url.search, method: request.method, body: text, contentType, userId: user, createdAt: Date.now(), attempts: 0, label })

  // Background Sync (Chrome/Android) can send it even if the tab is closed; other browsers send on the next visit
  try {
    await self.registration.sync?.register("aura-replay")
  } catch {
    /* not supported */
  }
  const state = await snapshot()
  broadcast({ type: "queued", label, pending: state.pending })
  broadcast(state)

  return new Response(
    JSON.stringify({
      success: true,
      queued: true,
      offline: true,
      message: "Saved offline. It will sync when you're back online.",
      data: { ...body, id: `offline-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), offline: true },
    }),
    { status: 202, headers: { "Content-Type": "application/json", "X-Aura-Queued": "1" } }
  )
}

let replaying = null
function replayQueue() {
  if (!replaying) replaying = doReplay().finally(() => (replaying = null))
  return replaying
}

async function failedMessage(res) {
  try {
    const data = await res.clone().json()
    return String(data.error || data.message || `Rejected (${res.status})`).slice(0, 200)
  } catch {
    return `Rejected (${res.status})`
  }
}

async function doReplay() {
  const user = await currentUser()
  if (!user) return
  const items = (await dbAll("queue")).filter((i) => i.userId === user).sort((a, b) => a.id - b.id)
  if (items.length === 0) return

  let sent = 0
  let failedNow = 0
  let authRequired = false

  for (const item of items) {
    let res
    try {
      res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": item.contentType, "X-Aura-Replay": "1" },
        body: item.body,
        credentials: "same-origin",
        redirect: "manual",
      })
    } catch {
      break // still offline: keep everything, try again later
    }

    if (res.ok) {
      await dbDelete("queue", item.id)
      sent++
      continue
    }
    if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) {
      authRequired = true // signed out: keep entries until the user signs in again
      break
    }
    if (res.status === 408 || res.status === 429 || res.status >= 500) {
      item.attempts = (item.attempts || 0) + 1
      if (item.attempts >= MAX_ATTEMPTS) {
        await dbDelete("queue", item.id)
        await dbPut("failed", { ...item, error: await failedMessage(res) })
        failedNow++
      } else {
        await dbPut("queue", item)
      }
      break // the server is struggling: stop here and keep the order
    }

    // 4xx: the server will never accept it as is, so park it where the user can see it instead of retrying forever
    await dbDelete("queue", item.id)
    await dbPut("failed", { ...item, error: await failedMessage(res) })
    failedNow++
  }

  const state = await snapshot()
  broadcast({ type: "synced", sent, failed: failedNow, pending: state.pending, authRequired })
  broadcast(state)
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

const userCacheName = (user, kind) => `${USER_PREFIX}${user}-${kind}-${VERSION}`

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

async function purgeOtherUsers(userId) {
  const keep = userId ? `${USER_PREFIX}${userId}-` : null
  const names = await caches.keys()
  await Promise.all(names.filter((n) => n.startsWith(USER_PREFIX) && (!keep || !n.startsWith(keep))).map((n) => caches.delete(n)))
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms)
    promise.then(
      (value) => (clearTimeout(timer), resolve(value)),
      (error) => (clearTimeout(timer), reject(error))
    )
  })
}

/** Network first (so data is always fresh online); the cached copy is only used when the network fails or is very slow. */
async function networkFirst(request, { kind, cacheable, key, fallback, ignoreVary = false }) {
  const user = await currentUser()
  const cacheName = user ? userCacheName(user, kind) : null
  const cacheKey = key || request.url

  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS)
    if (cacheName && cacheable(response)) {
      const copy = response.clone()
      caches.open(cacheName).then(async (cache) => {
        await cache.put(cacheKey, copy)
        await trim(cacheName, LIMITS[kind])
      })
    }
    return response
  } catch {
    if (cacheName) {
      const cached = await (await caches.open(cacheName)).match(cacheKey, { ignoreVary })
      if (cached) return cached
    }
    return fallback ? fallback() : Response.error()
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => (n.startsWith("aura-static-") && n !== STATIC_CACHE) || (n.startsWith(USER_PREFIX) && !n.endsWith(`-${VERSION}`)))
          .map((n) => caches.delete(n))
      )
      await self.clients.claim()
    })()
  )
})

// ── Requests ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Offline logging
  if (request.method === "POST" && QUEUEABLE.has(url.pathname)) {
    event.respondWith(
      (async () => {
        const copy = request.clone()
        try {
          return await fetch(request)
        } catch {
          return queueRequest(copy)
        }
      })()
    )
    return
  }
  if (request.method !== "GET") return

  // Hashed build assets never change: cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Data the pages load: last known copy when offline
  if (url.pathname.startsWith("/api/")) {
    if (CACHEABLE_API.some((re) => re.test(url.pathname))) {
      event.respondWith(networkFirst(request, { kind: "api", cacheable: (r) => r.ok && r.status === 200 }))
    }
    return
  }

  // Client-side navigations and refreshes inside the app (Next.js asks for the page data, not HTML)
  if (request.headers.get("rsc") === "1" || url.searchParams.has("_rsc")) {
    if (request.headers.get("next-router-prefetch")) return // prefetches are partial: don't cache or serve them
    const clean = new URL(request.url)
    clean.searchParams.delete("_rsc")
    event.respondWith(
      networkFirst(request, {
        kind: "rsc",
        key: clean.pathname + clean.search,
        ignoreVary: true,
        cacheable: (r) => r.ok && !r.redirected && (r.headers.get("content-type") || "").includes("text/x-component"),
        fallback: () => new Response("You are offline", { status: 503 }),
      })
    )
    return
  }

  // Full page loads
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, {
        kind: "pages",
        key: url.pathname + url.search,
        cacheable: (r) => r.ok && !r.redirected && url.pathname.startsWith("/dashboard"),
        fallback: async () => (await caches.match(OFFLINE_URL)) || new Response("You are offline", { status: 503 }),
      })
    )
  }
})

// ── Background sync + messages from the app ──────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "aura-replay") event.waitUntil(replayQueue())
})

self.addEventListener("message", (event) => {
  const msg = event.data || {}
  event.waitUntil(
    (async () => {
      switch (msg.type) {
        case "user": {
          // Who is signed in on this device now. Their queue is the only one that is sent, other people's caches are dropped.
          await dbPut("meta", msg.id || null, "user")
          await purgeOtherUsers(msg.id || null)
          await broadcast(await snapshot())
          break
        }
        case "replay":
          await replayQueue()
          break
        case "status":
          await broadcast(await snapshot())
          break
        case "discard": {
          await dbDelete(msg.store === "failed" ? "failed" : "queue", msg.id)
          await broadcast(await snapshot())
          break
        }
        case "retry-failed": {
          const user = await currentUser()
          for (const item of await dbAll("failed")) {
            if (item.userId !== user) continue
            await dbDelete("failed", item.id)
            const { id, error, ...rest } = item
            await dbPut("queue", { ...rest, attempts: 0 })
          }
          await replayQueue()
          break
        }
        case "clear-caches":
          // Sign-out: forget every user's cached pages and data (queued entries are kept so nothing the user typed is lost)
          await purgeOtherUsers(null)
          await dbPut("meta", null, "user")
          await broadcast(await snapshot())
          break
      }
    })()
  )
})
