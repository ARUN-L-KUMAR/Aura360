/**
 * Audit Logging System
 * 
 * Tracks all mutations across the system for:
 * - Security monitoring
 * - Compliance
 * - Debugging
 * - User activity tracking
 */

import { db, auditLogs, type WorkspaceContext } from "@/lib/db"
import { headers } from "next/headers"

export type AuditAction = "create" | "update" | "delete" | "login" | "logout"

export type AuditLogEntry = {
  workspaceId: string
  userId: string
  action: AuditAction
  entityType: string
  entityId: string
  beforeState?: Record<string, any>
  afterState?: Record<string, any>
  metadata?: Record<string, any>
}

/**
 * Create audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry) {
  try {
    // Get request headers for IP and user agent
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    // Calculate changes if both states provided
    const changes = entry.beforeState && entry.afterState
      ? calculateChanges(entry.beforeState, entry.afterState)
      : undefined

    await db.insert(auditLogs).values({
      ...entry,
      changes,
      ipAddress,
      userAgent,
    })
  } catch (error) {
    // Don't fail the operation if audit logging fails
    console.error("[Audit Log Error]", error)
  }
}

/**
 * Calculate what changed between two states
 */
function calculateChanges(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {}

  // Check all keys in after state
  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = {
        old: before[key],
        new: after[key],
      }
    }
  }

  // Check for deleted keys
  for (const key in before) {
    if (!(key in after)) {
      changes[key] = {
        old: before[key],
        new: undefined,
      }
    }
  }

  return changes
}

/**
 * Audit wrapper for create operations
 */
export async function auditCreate<T extends Record<string, any>>(
  context: WorkspaceContext,
  entityType: string,
  entityId: string,
  data: T,
  metadata?: Record<string, any>
) {
  await createAuditLog({
    ...context,
    action: "create",
    entityType,
    entityId,
    afterState: data,
    metadata,
  })
}

/**
 * Audit wrapper for update operations
 */
export async function auditUpdate<T extends Record<string, any>>(
  context: WorkspaceContext,
  entityType: string,
  entityId: string,
  beforeState: T,
  afterState: T,
  metadata?: Record<string, any>
) {
  await createAuditLog({
    ...context,
    action: "update",
    entityType,
    entityId,
    beforeState,
    afterState,
    metadata,
  })
}

/**
 * Audit wrapper for delete operations
 */
export async function auditDelete<T extends Record<string, any>>(
  context: WorkspaceContext,
  entityType: string,
  entityId: string,
  beforeState: T,
  metadata?: Record<string, any>
) {
  await createAuditLog({
    ...context,
    action: "delete",
    entityType,
    entityId,
    beforeState,
    metadata,
  })
}

/**
 * Track database operation with audit logging
 * 
 * Usage:
 * await trackOperation(
 *   context,
 *   "transactions",
 *   "create",
 *   async () => {
 *     const result = await db.insert(transactions).values(data)
 *     return { id: result[0].id, data }
 *   }
 * )
 */
export async function trackOperation<T>(
  context: WorkspaceContext,
  entityType: string,
  action: AuditAction,
  operation: () => Promise<{
    id: string
    data?: Record<string, any>
    beforeState?: Record<string, any>
    afterState?: Record<string, any>
  }>,
  metadata?: Record<string, any>
): Promise<T> {
  const result = await operation()

  await createAuditLog({
    ...context,
    action,
    entityType,
    entityId: result.id,
    beforeState: result.beforeState,
    afterState: result.afterState || result.data,
    metadata,
  })

  return result as T
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
  context: WorkspaceContext,
  entityType: string,
  entityId: string,
  options: {
    limit?: number
    offset?: number
  } = {}
) {
  const { limit = 50, offset = 0 } = options

  return db.query.auditLogs.findMany({
    where: (auditLogs, { and, eq }) =>
      and(
        eq(auditLogs.workspaceId, context.workspaceId),
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ),
    orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
    limit,
    offset,
  })
}

/**
 * Get user activity logs
 */
export async function getUserActivityLogs(
  context: WorkspaceContext,
  options: {
    limit?: number
    offset?: number
    action?: AuditAction
  } = {}
) {
  const { limit = 50, offset = 0, action } = options

  return db.query.auditLogs.findMany({
    where: (auditLogs, { and, eq }) =>
      and(
        eq(auditLogs.workspaceId, context.workspaceId),
        eq(auditLogs.userId, context.userId),
        action ? eq(auditLogs.action, action) : undefined
      ),
    orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
    limit,
    offset,
  })
}

/**
 * Get workspace activity logs (admin only)
 */
export async function getWorkspaceActivityLogs(
  workspaceId: string,
  options: {
    limit?: number
    offset?: number
    action?: AuditAction
    entityType?: string
  } = {}
) {
  const { limit = 100, offset = 0, action, entityType } = options

  return db.query.auditLogs.findMany({
    where: (auditLogs, { and, eq }) =>
      and(
        eq(auditLogs.workspaceId, workspaceId),
        action ? eq(auditLogs.action, action) : undefined,
        entityType ? eq(auditLogs.entityType, entityType) : undefined
      ),
    orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
    limit,
    offset,
  })
}
