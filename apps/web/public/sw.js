/* Aura360 service worker
 *
 * 1. App shell: hashed build assets are cached, so the app opens offline.
 * 2. Recently opened pages and API data are cached PER USER (named by user id) and wiped on sign-out, so a shared device
 *    never shows another person's data. They are only used when the network fails.
 * 3. Offline logging: creating an expense, workout, meal, time log, note, skincare product, fashion item, saved bookmark,
 *    or budget while offline is saved in IndexedDB and sent automatically when connection returns.
 * 4. Request idempotency: every queued request receives a unique UUID key header to avoid duplicate creates on reconnection drops.
 * 5. Web Push notification handling.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v2"
const STATIC_CACHE = `aura-static-${VERSION}`
const USER_PREFIX = "aura-user-"
const OFFLINE_URL = "/offline.html"
const PRECACHE = [OFFLINE_URL, "/favicon.png", "/manifest.json"]

/** Creating one of these offline is queued. Exact paths only (no /bulk, /batch or ?id= edits and deletes). */
const QUEUEABLE = new Set([
  "/api/finance/transactions",
  "/api/finance/budgets",
  "/api/finance/goals",
  "/api/fitness",
  "/api/food",
  "/api/time",
  "/api/notes",
  "/api/skincare",
  "/api/fashion",
  "/api/saved",
])

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
    case "/api/finance/budgets":
      return `Budget: ${b.category ?? "category"} (₹${b.amount ?? ""})`
    case "/api/finance/goals":
      return `Goal: ${b.title ?? "goal"} (₹${b.targetAmount ?? ""})`
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
    case "/api/fashion":
      return `Fashion item: ${b.name ?? "piece"}`
    case "/api/saved":
      return `Saved item: ${b.title ?? "link"}`
    default:
      return "Entry"
  }
}

async function queueRequest(request) {
  const user = await currentUser()
  const contentType = request.headers.get("content-type") || ""
  if (!user || !contentType.includes("application/json")) return Response.error()

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
  const idempotencyKey = crypto.randomUUID()

  await dbPut("queue", {
    url: url.pathname + url.search,
    method: request.method,
    body: text,
    contentType,
    userId: user,
    createdAt: Date.now(),
    attempts: 0,
    label,
    idempotencyKey,
  })

  // Background Sync (Chrome/Android) can send it even if the tab is closed
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
      data: { ...body, id: `offline-${idempotencyKey}`, createdAt: new Date().toISOString(), offline: true },
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
        headers: {
          "Content-Type": item.contentType,
          "X-Aura-Replay": "1",
          "X-Idempotency-Key": item.idempotencyKey || `queue-${item.id}`,
        },
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
      authRequired = true // signed out: keep entries until user signs in again
      break
    }
    if (res.status === 408 || res.status === 429 || res.status >= 500) {
      item.attempts = (item.attempts || 0) + 1
      if (item.attempts < MAX_ATTEMPTS) {
        await dbPut("queue", item)
        break // back off until next sync/online event
      }
    }
    // Permanent reject (400, 422, or exceeded attempts)
    await dbDelete("queue", item.id)
    await dbPut("failed", { ...item, error: await failedMessage(res) })
    failedNow++
  }

  const state = await snapshot()
  if (sent > 0 || failedNow > 0 || authRequired) {
    broadcast({ type: "replayed", sent, failed: failedNow, authRequired, pending: state.pending })
    broadcast(state)
  }
}

// ── Cache names per user ──────────────────────────────────────────────────────

const userCacheName = (userId, kind) => `${USER_PREFIX}${userId}-${kind}-${VERSION}`

async function purgeOtherUsers(keepUserId) {
  const all = await caches.keys()
  await Promise.all(
    all
      .filter((name) => name.startsWith(USER_PREFIX) && (!keepUserId || !name.startsWith(`${USER_PREFIX}${keepUserId}-`)))
      .map((name) => caches.delete(name))
  )
}

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= max) return
  const toDelete = keys.slice(0, keys.length - max)
  await Promise.all(toDelete.map((k) => cache.delete(k)))
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.map((k) => {
          if (k === STATIC_CACHE) return null
          if (k.startsWith(USER_PREFIX) && k.endsWith(`-${VERSION}`)) return null
          return caches.delete(k)
        })
      )
      await self.clients.claim()
      await replayQueue()
    })()
  )
})

// ── Fetch strategy ────────────────────────────────────────────────────────────

async function networkFirst(request, { kind, key, cacheable = (r) => r.ok, fallback }) {
  const user = await currentUser()
  const cacheName = user ? userCacheName(user, kind) : null

  let timer
  const network = fetch(request).then(async (res) => {
    if (cacheName && cacheable(res)) {
      const clone = res.clone()
      caches.open(cacheName).then((c) => c.put(key, clone).then(() => trimCache(cacheName, LIMITS[kind] || 40)))
    }
    return res
  })

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("network-timeout")), NETWORK_TIMEOUT_MS)
  })

  try {
    const res = await Promise.race([network, timeout])
    clearTimeout(timer)
    return res
  } catch {
    clearTimeout(timer)
    if (cacheName) {
      const cached = await caches.match(key)
      if (cached) return cached
    }
    if (fallback) return fallback()
    return Response.error()
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method === "POST" && QUEUEABLE.has(url.pathname)) {
    event.respondWith(
      fetch(request.clone()).catch(async (error) => {
        if (!navigator.onLine || error.name === "TypeError") {
          return queueRequest(request)
        }
        throw error
      })
    )
    return
  }

  if (request.method !== "GET") return

  // Cache-first for static build artifacts
  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Network-first for cacheable user APIs
  if (url.origin === self.location.origin && CACHEABLE_API.some((rx) => rx.test(url.pathname))) {
    event.respondWith(
      networkFirst(request, {
        kind: "api",
        key: url.pathname + url.search,
        cacheable: (r) => r.ok,
        fallback: () =>
          new Response(JSON.stringify({ error: "offline", offline: true, message: "Offline — showing cached data" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
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
          await purgeOtherUsers(null)
          await dbPut("meta", null, "user")
          await broadcast(await snapshot())
          break
      }
    })()
  )
})

// ── Web Push Notifications ───────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = { title: "Aura360", body: "New activity in your lifestyle command center." }
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch {
    if (event.data) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body || "New notification",
    icon: data.icon || "/favicon.png",
    badge: data.badge || "/favicon.png",
    data: {
      url: data.actionUrl || data.url || "/dashboard",
    },
    tag: data.tag || undefined,
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(data.title || "Aura360", options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/dashboard"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
