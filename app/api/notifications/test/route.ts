/**
 * POST /api/notifications/test  - sends a test notification to the signed-in user on every channel they have on,
 * so they can check that in-app, email and phone push all arrive. Ignores quiet hours.
 */

import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { notify } from "@/lib/notifications/dispatch"

// Light throttle so the button can't be used to spam an inbox
const last = new Map<string, number>()
const COOLDOWN_MS = 10_000

export async function POST() {
  try {
    const context = await getWorkspaceContext()
    const now = Date.now()
    if (now - (last.get(context.userId) ?? 0) < COOLDOWN_MS) {
      return NextResponse.json({ error: "Please wait a few seconds before sending another test" }, { status: 429 })
    }
    last.set(context.userId, now)

    const result = await notify({
      ctx: context,
      kind: "test",
      title: "Test notification ✅",
      message: "If you can read this, your reminders are working.",
      type: "success",
      actionUrl: "/dashboard/settings",
      force: true,
    })
    return NextResponse.json({ result })
  } catch (error) {
    console.error("[Notification Test API] error:", error)
    return NextResponse.json({ error: "Failed to send the test notification" }, { status: 500 })
  }
}
