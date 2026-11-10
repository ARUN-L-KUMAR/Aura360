/**
 * GET /api/notifications/preferences  - the user's reminder settings (defaults if never saved)
 * PUT /api/notifications/preferences  - save them
 */

import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { isMissingTable, loadPrefs, notificationPrefsSchema, savePrefs } from "@/lib/notifications/preferences"
import { pushDeviceCount } from "@/lib/notifications/channels"
import { safeTimezone } from "@/lib/notifications/time"

const SETUP_MESSAGE = "The notification tables don't exist yet. Run: npm run db:create-notifications"

export async function GET() {
  try {
    const context = await getWorkspaceContext()
    const [prefs, devices] = await Promise.all([loadPrefs(context.userId), pushDeviceCount(context.userId)])
    return NextResponse.json({ prefs, devices })
  } catch (error) {
    console.error("[Notification Prefs API] GET error:", error)
    return NextResponse.json({ error: "Failed to load notification settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json().catch(() => null)

    const parsed = notificationPrefsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid notification settings", details: parsed.error.errors }, { status: 400 })
    }

    const prefs = { ...parsed.data, timezone: safeTimezone(parsed.data.timezone) }
    await savePrefs(context, prefs)
    return NextResponse.json({ prefs })
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    console.error("[Notification Prefs API] PUT error:", error)
    return NextResponse.json({ error: "Failed to save notification settings" }, { status: 500 })
  }
}
