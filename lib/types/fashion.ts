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
  wearCount: number | null
  lastWornDate: string | null | Date
  tags: string[] | null
  isFavorite: boolean
  notes: string | null
  metadata?: FashionMetadata | null
  createdAt: Date | string
  updatedAt: Date | string
}
