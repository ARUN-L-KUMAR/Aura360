/**
 * Notes Module Types
 * Matches the database schema from lib/db/schema.ts
 */

export interface Note {
  id: string
  workspaceId: string
  userId: string
  title: string
  content?: string | null
  category?: string | null
  tags?: string[] | null
  isPinned: boolean
  isArchived: boolean
  color?: string | null
  attachments?: string[] | null
  metadata?: Record<string, any> | null
  createdAt: Date | string
  updatedAt: Date | string
}
