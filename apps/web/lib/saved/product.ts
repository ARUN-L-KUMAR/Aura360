/**
 * Wishlist / owned status for products kept in Saved.
 *
 * Saved has no status column, so the status lives in the item's metadata (`metadata.status`). Only items of type
 * "product" have one, and a product with none yet is on the wishlist, so older items need no migration.
 * The mobile app keeps its own copy of this rule in apps/mobile/src/features/saved/types.ts: change both together.
 */

export const PRODUCT_STATUSES = ["wishlist", "owned"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const isProductStatus = (value: unknown): value is ProductStatus =>
  typeof value === "string" && (PRODUCT_STATUSES as readonly string[]).includes(value)

type WithMetadata = { type?: string | null; metadata?: Record<string, any> | null }

/** "wishlist" | "owned" for a saved product, null for every other kind of saved item. */
export function productStatusOf(item: WithMetadata): ProductStatus | null {
  if (item.type !== "product") return null
  return item.metadata?.status === "owned" ? "owned" : "wishlist"
}

export type ProductInfo = {
  category: string | null
  price: number | null
  currency: string
  store: string | null
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)

/** The shopping details saved with a product: category, price, store. */
export function productInfoOf(metadata: Record<string, any> | null | undefined): ProductInfo {
  const m = metadata ?? {}
  const raw = m.price
  const price = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw.replace(/,/g, "")) : Number.NaN
  return {
    category: text(m.category),
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: text(m.currency) ?? "INR",
    store: text(m.store),
  }
}

export function formatPrice(price: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(price)
  } catch {
    return `₹${Math.round(price).toLocaleString("en-IN")}`
  }
}
