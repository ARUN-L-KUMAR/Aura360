/**
 * Time Logs Module Types
 * Matches the database schema from lib/db/schema.ts
 */

export interface TimeLog {
  id: string
  workspaceId: string
  userId: string
  date: string | Date
  activity: string
  category?: string | null
  duration: number // minutes
  startTime?: Date | string | null
  endTime?: Date | string | null
  description?: string | null
  tags?: string[] | null
  productivityScore?: number | null
  metadata?: Record<string, any> | null
  createdAt: Date | string
  updatedAt: Date | string
}
