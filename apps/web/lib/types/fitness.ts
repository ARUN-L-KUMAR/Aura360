/**
 * Fitness Module Types
 * Matches the database schema from lib/db/schema.ts
 */

export interface FitnessEntry {
  id: string
  workspaceId: string
  userId: string
  date: string | Date
  type: string
  workoutType?: string | null
  duration?: number | null // minutes
  caloriesBurned?: number | null
  distance?: string | number | null
  intensity?: string | null
  measurementType?: string | null
  measurementValue?: string | number | null
  measurementUnit?: string | null
  exercises?: Array<{
    name: string
    sets?: number
    reps?: number
    weight?: number
  }> | null
  notes?: string | null
  mood?: string | null
  metadata?: Record<string, any> | null
  createdAt: Date | string
  updatedAt: Date | string
}
