/**
 * Phone registration for push notifications (called by the mobile app after the user allows notifications).
 *
 * POST   /api/notifications/push-token  { token, platform?, deviceName? }  - register or refresh a phone
 * DELETE /api/notifications/push-token  { token }                          - forget it (on sign-out)
 *
 * Works with the web session cookie or the mobile Bearer token, like every other API route.
 */

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db, pushTokens } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { isExpoPushToken } from "@/lib/notifications/channels"
import { isMissingTable } from "@/lib/notifications/preferences"

const SETUP_MESSAGE = "The notification tables don't exist yet. Run: npm run db:create-notifications"

const registerSchema = z.object({
  token: z.string().max(200).refine(isExpoPushToken, "Not an Expo push token"),
  platform: z.enum(["ios", "android", "web"]).optional(),
  deviceName: z.string().trim().max(80).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const parsed = registerSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "A valid Expo push token is required" }, { status: 400 })

    const { token, platform, deviceName } = parsed.data
    // A phone belongs to whoever is signed in on it now, so a token that moves between accounts is re-pointed
    await db
      .insert(pushTokens)
      .values({ ...context, token, platform, deviceName })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { userId: context.userId, workspaceId: context.workspaceId, platform, deviceName, lastSeenAt: new Date() },
      })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    console.error("[Push Token API] POST error:", error)
    return NextResponse.json({ error: "Failed to register this device" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === "string" ? body.token : ""
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 })

    await db.delete(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.userId, context.userId)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ ok: true })
    console.error("[Push Token API] DELETE error:", error)
    return NextResponse.json({ error: "Failed to remove this device" }, { status: 500 })
  }
}
