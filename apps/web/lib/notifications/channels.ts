import nodemailer from "nodemailer"
import { eq, inArray } from "drizzle-orm"
import { db, pushTokens, users } from "@/lib/db"

/** Email and mobile-push delivery. Both return quietly (never throw) so one failing channel can't block the rest. */

const APP_NAME = "Aura360"
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Web path -> the mobile app's screen and Android channel (the app opens data.route when a push is tapped). */
function mobileTarget(actionUrl?: string | null): { route: string; channelId: string } {
  const module = actionUrl?.match(/^\/dashboard\/([a-z]+)/)?.[1]
  const screens = new Set(["finance", "fitness", "food", "fashion", "skincare", "time", "notes", "saved"])
  return { route: module && screens.has(module) ? `/${module}` : "/", channelId: module === "finance" ? "finance" : "habits" }
}

export interface ChannelPayload {
  title: string
  message: string
  /** App path such as /dashboard/finance */
  actionUrl?: string | null
}

// ── Email ───────────────────────────────────────────────────────────────────

async function emailAddressOf(userId: string): Promise<string | null> {
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
  return user?.email ?? null
}

function emailHtml({ title, message, actionUrl }: ChannelPayload) {
  const link = actionUrl ? `${appUrl()}${actionUrl}` : appUrl()
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
    <p style="margin:0 0 16px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#71717a;">${APP_NAME}</p>
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#18181b;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(message)}</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px;">Open ${APP_NAME}</a>
    <p style="margin:28px 0 0;font-size:12px;color:#a1a1aa;">You get this because email reminders are on. Change it any time in Settings &gt; Notifications.</p>
  </div>
</body></html>`
}

/** Sends through Resend when RESEND_API_KEY and NOTIFY_EMAIL_FROM are set, otherwise through the existing Gmail SMTP. */
export async function sendEmailNotification(userId: string, payload: ChannelPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const to = await emailAddressOf(userId)
    if (!to) return { ok: false, error: "No email address on the account" }

    const subject = payload.title
    const html = emailHtml(payload)

    if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_FROM) {
      const { Resend } = await import("resend")
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.NOTIFY_EMAIL_FROM,
        to,
        subject,
        html,
      })
      return error ? { ok: false, error: error.message } : { ok: true }
    }

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      return { ok: false, error: "Email is not configured (set SMTP_EMAIL and SMTP_PASSWORD, or RESEND_API_KEY and NOTIFY_EMAIL_FROM)" }
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
    })
    await transporter.sendMail({ from: `"${APP_NAME}" <${process.env.SMTP_EMAIL}>`, to, subject, html })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email failed" }
  }
}

// ── Mobile push (Expo) ──────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/

export const isExpoPushToken = (token: string) => EXPO_TOKEN_PATTERN.test(token)

export async function pushDeviceCount(userId: string): Promise<number> {
  try {
    const rows = await db.select({ id: pushTokens.id }).from(pushTokens).where(eq(pushTokens.userId, userId))
    return rows.length
  } catch {
    return 0
  }
}

export async function sendPushNotification(userId: string, payload: ChannelPayload): Promise<{ ok: boolean; devices: number; error?: string }> {
  try {
    const rows = await db.select({ token: pushTokens.token }).from(pushTokens).where(eq(pushTokens.userId, userId))
    const tokens = rows.map((r) => r.token).filter(isExpoPushToken)
    if (tokens.length === 0) return { ok: false, devices: 0, error: "No phone is registered for push" }

    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" }
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`

    const dead: string[] = []
    let delivered = 0

    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100)
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(
          chunk.map((to) => ({
            to,
            title: payload.title,
            body: payload.message,
            sound: "default",
            channelId: mobileTarget(payload.actionUrl).channelId,
            data: { url: payload.actionUrl ?? null, route: mobileTarget(payload.actionUrl).route },
          }))
        ),
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) continue

      const result = (await response.json().catch(() => null)) as { data?: Array<{ status?: string; details?: { error?: string } }> } | null
      result?.data?.forEach((ticket, index) => {
        if (ticket.status === "ok") delivered++
        else if (ticket.details?.error === "DeviceNotRegistered") dead.push(chunk[index])
      })
    }

    // Forget phones that uninstalled the app
    if (dead.length > 0) await db.delete(pushTokens).where(inArray(pushTokens.token, dead)).catch(() => undefined)

    return { ok: delivered > 0, devices: delivered }
  } catch (error) {
    return { ok: false, devices: 0, error: error instanceof Error ? error.message : "Push failed" }
  }
}
