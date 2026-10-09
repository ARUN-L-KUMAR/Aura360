/**
 * POST /api/mobile/auth/google
 * Body: { idToken, deviceName? }  (Google ID token obtained by the native Google sign-in)
 *
 * The token is checked against Google and must have been issued to one of our own
 * client IDs: GOOGLE_MOBILE_CLIENT_IDS (comma separated; the iOS, Android and web client IDs).
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureGoogleUser } from "@/lib/google-user"
import { createMobileSession } from "@/lib/mobile-auth"

const googleSchema = z.object({
  idToken: z.string().min(20).max(4000),
  deviceName: z.string().max(100).optional(),
})

type GoogleTokenInfo = {
  iss?: string
  aud?: string
  sub?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
  exp?: string
}

function allowedAudiences() {
  return [process.env.GOOGLE_MOBILE_CLIENT_IDS, process.env.GOOGLE_CLIENT_ID]
    .flatMap((value) => (value ? value.split(",") : []))
    .map((value) => value.trim())
    .filter(Boolean)
}

export async function POST(request: NextRequest) {
  const parsed = googleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "idToken required" }, { status: 400 })
  }

  const audiences = allowedAudiences()
  if (audiences.length === 0) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 501 })
  }

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.idToken)}`
    )
    if (!res.ok) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 })
    }
    const info = (await res.json()) as GoogleTokenInfo

    const issuerOk = info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com"
    const verified = info.email_verified === true || info.email_verified === "true"
    if (!issuerOk || !verified || !info.email || !info.sub || !info.aud || !audiences.includes(info.aud)) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 })
    }

    const userId = await ensureGoogleUser(
      { email: info.email, name: info.name, image: info.picture },
      { type: "oidc", provider: "google", providerAccountId: info.sub }
    )

    const session = await createMobileSession(userId, parsed.data.deviceName)
    if (!session) {
      return NextResponse.json({ error: "Account has no workspace" }, { status: 409 })
    }
    return NextResponse.json(session)
  } catch (error) {
    console.error("[Mobile Auth] google error:", error)
    return NextResponse.json({ error: "Google sign in failed" }, { status: 500 })
  }
}
