import type { ScrapedProduct } from "@/lib/types/fashion"

/**
 * Short-lived memory of products the chat has just read from a link, so the "add it" step that follows
 * reuses them (no second fetch) and the confirmation prompt can show the real name and price.
 */

const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 50

const store = new Map<string, { at: number; product: ScrapedProduct }>()

const keyOf = (url: string) => url.trim().replace(/#.*$/, "")

function prune() {
  const now = Date.now()
  for (const [key, entry] of store) if (now - entry.at > TTL_MS) store.delete(key)
  while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string)
}

export function cacheProduct(url: string, product: ScrapedProduct) {
  prune()
  const entry = { at: Date.now(), product }
  store.set(keyOf(url), entry)
  if (product.buying_link) store.set(keyOf(product.buying_link), entry)
}

export function getCachedProduct(url: string): ScrapedProduct | null {
  const entry = store.get(keyOf(url))
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(keyOf(url))
    return null
  }
  return entry.product
}
