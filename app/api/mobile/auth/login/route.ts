/**
 * POST /api/mobile/auth/login
 * Body: { email, password, deviceName? }
 * Returns: { accessToken, refreshToken, expiresIn, user }
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyCredentials } from "@/lib/credentials"
import { createMobileSession } from "@/lib/mobile-auth"
import { isRateLimited } from "@/lib/simple-rate-limit"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  deviceName: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }
  const { email, password, deviceName } = parsed.data

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isRateLimited(`login:${ip}:${email.toLowerCase()}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 })
  }

  try {
    const user = await verifyCredentials(email, password)
    const session = await createMobileSession(user.id, deviceName)
    if (!session) {
      return NextResponse.json({ error: "Account has no workspace" }, { status: 409 })
    }
    return NextResponse.json(session)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed"
    const isCredentialError =
      message === "Invalid email or password" || message === "Please verify your email before signing in"
    if (!isCredentialError) console.error("[Mobile Auth] login error:", error)
    return NextResponse.json(
      { error: isCredentialError ? message : "Sign in failed" },
      { status: isCredentialError ? 401 : 500 }
    )
  }
}
