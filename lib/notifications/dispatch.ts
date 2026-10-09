import { and, eq } from "drizzle-orm"
import { db, notifications, notificationLog, type WorkspaceContext } from "@/lib/db"
import { isMissingTable, loadPrefs, type NotificationPrefs } from "./preferences"
import { sendEmailNotification, sendPushNotification } from "./channels"
import { inQuietHours, localParts } from "./time"

export type NotificationKind = "budget" | "subscription" | "workout" | "meal" | "skincare" | "fashion" | "test"

export interface NotifyInput {
  ctx: WorkspaceContext
  kind: NotificationKind
  title: string
  message: string
  type?: "info" | "warning" | "success" | "error"
  /** App path the notification opens, e.g. /dashboard/finance */
  actionUrl?: string
  /** Same key = sent only once (for example "budget:<id>:2026-10:over") */
  dedupeKey?: string
  metadata?: Record<string, unknown>
  prefs?: NotificationPrefs
  now?: Date
  /** Skip de-duplication and quiet hours (used by "send a test") */
  force?: boolean
  /** Work out what would be sent without sending or remembering anything */
  dryRun?: boolean
}

export interface NotifyResult {
  sent: boolean
  reason?: "duplicate" | "dry-run" | "error"
  email?: { ok: boolean; error?: string } | "skipped"
  push?: { ok: boolean; devices: number; error?: string } | "skipped"
}

/** Returns true when this key is new (and records it); false when it was already sent. */
async function claim(userId: string, dedupeKey: string): Promise<boolean> {
  try {
    const inserted = await db.insert(notificationLog).values({ userId, dedupeKey }).onConflictDoNothing().returning({ id: notificationLog.id })
    return inserted.length > 0
  } catch (error) {
    // Table not created yet: carry on without de-duplication rather than losing the alert
    if (!isMissingTable(error)) console.warn("[Notifications] dedupe check failed:", (error as Error)?.message)
    return true
  }
}

async function unclaim(userId: string, dedupeKey: string) {
  await db
    .delete(notificationLog)
    .where(and(eq(notificationLog.userId, userId), eq(notificationLog.dedupeKey, dedupeKey)))
    .catch(() => undefined)
}

/**
 * Delivers one notification: always in-app, plus email and phone push when the user turned them on
 * (and it is not their quiet hours). Never throws, so a caller's main work is never blocked.
 */
export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const { ctx, title, message, dedupeKey, force = false, dryRun = false } = input
  try {
    const prefs = input.prefs ?? (await loadPrefs(ctx.userId))
    const now = input.now ?? new Date()

    if (dryRun) {
      if (dedupeKey) {
        const [seen] = await db
          .select({ id: notificationLog.id })
          .from(notificationLog)
          .where(and(eq(notificationLog.userId, ctx.userId), eq(notificationLog.dedupeKey, dedupeKey)))
          .limit(1)
          .catch(() => [])
        if (seen) return { sent: false, reason: "duplicate" }
      }
      return { sent: false, reason: "dry-run" }
    }

    if (dedupeKey && !force && !(await claim(ctx.userId, dedupeKey))) {
      return { sent: false, reason: "duplicate" }
    }

    try {
      await db.insert(notifications).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        title,
        message,
        type: input.type ?? "info",
        actionUrl: input.actionUrl,
        metadata: { source: input.kind, ...(dedupeKey ? { dedupeKey } : {}), ...input.metadata },
      })
    } catch (error) {
      if (dedupeKey && !force) await unclaim(ctx.userId, dedupeKey)
      throw error
    }

    const result: NotifyResult = { sent: true, email: "skipped", push: "skipped" }

    const quiet = !force && prefs.quietHours.enabled && inQuietHours(localParts(now, prefs.timezone).minutes, prefs.quietHours.start, prefs.quietHours.end)
    if (!quiet) {
      const payload = { title, message, actionUrl: input.actionUrl }
      const [email, push] = await Promise.all([
        prefs.email ? sendEmailNotification(ctx.userId, payload) : Promise.resolve("skipped" as const),
        prefs.push ? sendPushNotification(ctx.userId, payload) : Promise.resolve("skipped" as const),
      ])
      result.email = email
      result.push = push
    }
    return result
  } catch (error) {
    console.warn("[Notifications] notify failed:", error instanceof Error ? error.message : error)
    return { sent: false, reason: "error" }
  }
}
