/**
 * Food Module Types
 * Matches the database schema from lib/db/schema.ts
 */

export interface Meal {
  id: string
  workspaceId: string
  userId: string
  date: string | Date
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  foodName: string
  quantity?: string | number | null
  unit?: string | null
  calories?: number | null
  protein?: string | number | null
  carbs?: string | number | null
  fats?: string | number | null
  fiber?: string | number | null
  sugar?: string | number | null
  imageUrl?: string | null
  recipe?: string | null
  rating?: number | null
  notes?: string | null
  tags?: string[] | null
  metadata?: Record<string, any> | null
  createdAt: Date | string
  updatedAt: Date | string
}
