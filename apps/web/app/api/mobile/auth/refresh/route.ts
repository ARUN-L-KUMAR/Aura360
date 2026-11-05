/**
 * POST /api/mobile/auth/refresh
 * Body: { refreshToken }
 * Returns a new { accessToken, refreshToken, expiresIn, user }; the old refresh token is revoked.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rotateMobileSession } from "@/lib/mobile-auth"

const refreshSchema = z.object({ refreshToken: z.string().min(20).max(500) })

export async function POST(request: NextRequest) {
  const parsed = refreshSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "refreshToken required" }, { status: 400 })
  }

  try {
    const session = await rotateMobileSession(parsed.data.refreshToken)
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 })
    }
    return NextResponse.json(session)
  } catch (error) {
    console.error("[Mobile Auth] refresh error:", error)
    return NextResponse.json({ error: "Could not refresh session" }, { status: 500 })
  }
}
