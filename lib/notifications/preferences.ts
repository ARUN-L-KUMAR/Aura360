import { eq } from "drizzle-orm"
import { db, notificationPreferences, type WorkspaceContext } from "@/lib/db"
import { mergePrefs, type NotificationPrefs, DEFAULT_PREFS } from "./prefs-schema"

export { DEFAULT_PREFS, mergePrefs, notificationPrefsSchema, type NotificationPrefs } from "./prefs-schema"

export const isMissingTable = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } }
  return (e?.code ?? e?.cause?.code) === "42P01"
}

/** The user's preferences, or the defaults when nothing is saved yet (or the table doesn't exist yet). */
export async function loadPrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const [row] = await db
      .select({ data: notificationPreferences.data })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)
    return mergePrefs(row?.data)
  } catch (error) {
    if (!isMissingTable(error)) console.warn("[Notifications] could not load preferences:", (error as Error)?.message)
    return DEFAULT_PREFS
  }
}

export async function savePrefs(ctx: WorkspaceContext, prefs: NotificationPrefs): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({ ...ctx, data: prefs })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { data: prefs, workspaceId: ctx.workspaceId, updatedAt: new Date() },
    })
}

