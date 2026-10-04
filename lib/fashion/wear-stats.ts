import type { FashionItem } from "@/lib/types/fashion"

export const NEGLECTED_AFTER_DAYS = 60

/** Today's date as YYYY-MM-DD in the user's local timezone (toISOString would give UTC). */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const DAY_MS = 24 * 60 * 60 * 1000

export function itemPrice(item: FashionItem): number {
  const n = Number(item.price)
  return Number.isFinite(n) ? n : 0
}

/** Price divided by wears (a never-worn item counts as 1 wear so it isn't "free"). */
export function costPerWear(item: FashionItem): number | null {
  const price = itemPrice(item)
  if (price <= 0) return null
  return price / Math.max(item.wearCount ?? 0, 1)
}

/** Days since the item was last worn, or null if it never has been. */
export function daysSinceWorn(item: FashionItem, now = new Date()): number | null {
  if (!item.lastWornDate) return null
  const worn = new Date(item.lastWornDate)
  if (Number.isNaN(worn.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - worn.getTime()) / DAY_MS))
}

/**
 * An item is neglected if it was never worn (and has been owned long enough)
 * or hasn't been worn in `days` days. Recently added items get a grace period.
 */
export function isNeglected(item: FashionItem, days = NEGLECTED_AFTER_DAYS, now = new Date()): boolean {
  if (item.status !== "wardrobe") return false
  const since = daysSinceWorn(item, now)
  if (since !== null) return since >= days

  const owned = new Date(item.purchaseDate ?? item.createdAt)
  if (Number.isNaN(owned.getTime())) return true
  return (now.getTime() - owned.getTime()) / DAY_MS >= days
}

export interface WearInsights {
  totalValue: number
  totalWears: number
  avgCostPerWear: number | null
  mostWorn: FashionItem[]
  bestValue: FashionItem[]
  neglected: FashionItem[]
}

export function computeWearInsights(wardrobe: FashionItem[], limit = 3): WearInsights {
  const totalValue = wardrobe.reduce((sum, i) => sum + itemPrice(i), 0)
  const totalWears = wardrobe.reduce((sum, i) => sum + (i.wearCount ?? 0), 0)

  const worn = wardrobe.filter((i) => (i.wearCount ?? 0) > 0)
  const priced = worn.filter((i) => itemPrice(i) > 0)
  const avgCostPerWear =
    priced.length > 0
      ? priced.reduce((sum, i) => sum + (costPerWear(i) ?? 0), 0) / priced.length
      : null

  const mostWorn = [...worn].sort((a, b) => (b.wearCount ?? 0) - (a.wearCount ?? 0)).slice(0, limit)
  const bestValue = [...priced]
    .sort((a, b) => (costPerWear(a) ?? Infinity) - (costPerWear(b) ?? Infinity))
    .slice(0, limit)

  const neglected = wardrobe
    .filter((i) => isNeglected(i))
    .sort((a, b) => (daysSinceWorn(b) ?? Infinity) - (daysSinceWorn(a) ?? Infinity))

  return { totalValue, totalWears, avgCostPerWear, mostWorn, bestValue, neglected }
}
