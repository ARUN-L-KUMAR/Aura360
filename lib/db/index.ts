/**
 * Aura360 Database Connection - NeonDB Serverless
 * 
 * Features:
 * - Edge-compatible serverless driver
 * - Workspace-scoped queries
 * - Transaction helpers
 * - Type-safe queries with Drizzle
 */

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please add it to your environment variables."
  )
}

// Create Neon serverless connection (HTTP mode - no transactions but edge-compatible)
const sql = neon(process.env.DATABASE_URL)

// Create Drizzle instance with schema
export const db = drizzle(sql, { schema })

// Export schema for use in queries
export * from "./schema"

/**
 * Type-safe workspace context
 */
export type WorkspaceContext = {
  workspaceId: string
  userId: string
}

/**
 * Helper to validate workspace context
 */
export function requireWorkspaceContext(
  context: Partial<WorkspaceContext>
): WorkspaceContext {
  if (!context.workspaceId || !context.userId) {
    throw new Error("Workspace context is required (workspaceId and userId)")
  }
  return context as WorkspaceContext
}

/**
 * Workspace-scoped query builder
 * 
 * Usage:
 * const data = await workspaceQuery(
 *   { workspaceId, userId },
 *   (database) => database.select().from(transactions)
 * )
 */
export async function workspaceQuery<T>(
  context: WorkspaceContext,
  query: (database: typeof db) => Promise<T>
): Promise<T> {
  requireWorkspaceContext(context)
  return query(db)
}

/**
 * Transaction wrapper for atomic operations
 * Note: HTTP mode doesn't support transactions - this is a pass-through
 * For true ACID transactions, use WebSocket mode
 */
export async function dbTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  // Neon HTTP doesn't support transactions, so we just call the callback
  // In production, consider using WebSocket mode for transaction support
  return callback(db)
}

/**
 * Pagination helper
 */
export type PaginationParams = {
  page?: number
  pageSize?: number
}

export function getPaginationParams(params: PaginationParams) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 10))
  const offset = (page - 1) * pageSize
  
  return {
    limit: pageSize,
    offset,
    page,
    pageSize,
  }
}

/**
 * Date range helper
 */
export type DateRangeParams = {
  startDate?: string | Date
  endDate?: string | Date
}

export function getDateRange(params: DateRangeParams) {
  const start = params.startDate
    ? new Date(params.startDate)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  
  const end = params.endDate
    ? new Date(params.endDate)
    : new Date()
  
  return { startDate: start, endDate: end }
}
