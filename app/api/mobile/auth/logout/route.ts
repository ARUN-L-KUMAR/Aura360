/**
 * POST /api/mobile/auth/logout
 * Body: { refreshToken }
 * Revokes the refresh token. Always succeeds so the app can clear its local state.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { revokeMobileSession } from "@/lib/mobile-auth"

const logoutSchema = z.object({ refreshToken: z.string().min(20).max(500) })

export async function POST(request: NextRequest) {
  const parsed = logoutSchema.safeParse(await request.json().catch(() => null))
  if (parsed.success) {
    try {
      await revokeMobileSession(parsed.data.refreshToken)
    } catch (error) {
      console.error("[Mobile Auth] logout error:", error)
    }
  }
  return NextResponse.json({ ok: true })
}
