/**
 * Fashion Item Types
 * Matches the database schema from lib/db/schema.ts
 */

export interface FashionMetadata {
  buyingLink?: string
  occasion?: string[]
  season?: string[]
  expectedBudget?: number
  buyDeadline?: string
  condition?: string
  priority?: number
  /** Details captured from the shop when the item was imported from a product link */
  originalPrice?: number
  discount?: string
  rating?: number
  reviewsCount?: number
  platform?: string
  availableSizes?: string[]
  availableColors?: string[]
  [key: string]: any
}

export interface FashionItem {
  id: string
  workspaceId: string
  userId: string
  name: string
  description: string | null
  category: string
  subcategory: string | null
  brand: string | null
  color: string | null
  size: string | null
  price: string | null // decimal is returned as string
  purchaseDate: string | null | Date
  imageUrl: string | null
  images: string[] | null
  status: "wardrobe" | "wishlist" | "sold" | "donated"
  condition: "new" | "good" | "fair" | "needs_repair" | "needs_wash" | null
  occasion: string[] | null
  season: string[] | null
  wearCount: number | null
  lastWornDate: string | null | Date
  tags: string[] | null
  isFavorite: boolean
  notes: string | null
  metadata?: Record<string, any> | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface FashionOutfit {
  id: string
  workspaceId: string
  userId: string
  name: string
  itemIds: string[]
  occasion: string | null
  vibe: string | null
  notes: string | null
  wearCount: number
  lastWornDate: string | null
  wornDates: string[] | null
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * Product details scraped from a shopping link (Amazon, Flipkart, Myntra, Meesho, Ajio)
 */
/** One measurement from a size chart, always stored in cm. */
export interface MeasurementReading {
  /** Canonical key when known (chest, waist, hips, shoulders, neck, inseam, outseam, rise, sleeve, length), else a slug */
  key: string
  label: string
  cm: number
}

/** What the shop lists for one size: BODY = the body size it is made for, GARMENT = the garment's own dimensions. */
export interface SizeChartRow {
  size: string
  available: boolean
  body: MeasurementReading[]
  garment: MeasurementReading[]
}

export interface ScrapedProduct {
  product_name: string
  brand: string
  category: string
  price: {
    /** Numeric string without currency symbol, e.g. "1299" (safe for number inputs) */
    current: string
    original?: string
    discount?: string
  }
  currency?: string
  color: string
  /** Every colour the shop sells this product in (when the page lists them) */
  colors?: string[]
  size: string[] | string
  rating?: string
  reviews_count?: string
  description: string
  features?: string[]
  images: string[]
  /** Per-size measurements, when the page lists them */
  sizeChart?: SizeChartRow[]
  buying_link: string
  platform: string
}
