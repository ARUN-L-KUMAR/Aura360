/**
 * Scheduled notification run: budgets, subscription renewals, workout/meal/skincare reminders, unworn clothes.
 *
 *   GET or POST /api/cron/notifications            run it
 *   GET or POST /api/cron/notifications?dryRun=1   show what WOULD be sent, send nothing
 *
 * Call it every 5-15 minutes from any scheduler (Vercel Cron, a server crontab, cron-job.org, GitHub Actions) with
 *   Authorization: Bearer <CRON_SECRET>
 * Vercel Cron sends that header by itself when the CRON_SECRET environment variable is set.
 * It is safe to call often: each alert is only ever sent once.
 */

import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { runNotificationJobs } from "@/lib/notifications/jobs"
import { isMissingTable } from "@/lib/notifications/preferences"

export const runtime = "nodejs"
export const maxDuration = 60

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // fail closed: with no secret configured the endpoint stays off

  const header = request.headers.get("authorization") ?? ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  const a = crypto.createHash("sha256").update(provided).digest()
  const b = crypto.createHash("sha256").update(secret).digest()
  return crypto.timingSafeEqual(a, b)
}

async function handle(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not set on the server, so the scheduled run is disabled" }, { status: 503 })
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dryRun = ["1", "true"].includes(request.nextUrl.searchParams.get("dryRun") ?? "")
  try {
    const summary = await runNotificationJobs({ dryRun })
    return NextResponse.json(summary)
  } catch (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: "Notification tables are missing. Run: npm run db:create-notifications" }, { status: 503 })
    }
    console.error("[Cron Notifications] error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Notification run failed" }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
