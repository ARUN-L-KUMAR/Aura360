import { NextRequest, NextResponse } from "next/server"
import { db, users, verificationTokens } from "@/lib/db"
import { eq } from "drizzle-orm"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/resend"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()

    // 1. Check if user exists
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1)

    // For security, always respond with success even if user not found (prevents enumeration)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset link has been dispatched.",
      })
    }

    // 2. Generate secure reset token
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry

    // 3. Store reset token with identifier 'reset:<email>'
    const identifier = `reset:${cleanEmail}`

    // Clean up any existing tokens for this identifier
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier))

    await db.insert(verificationTokens).values({
      identifier,
      token,
      expires,
    })

    // 4. Send email
    const emailResult = await sendPasswordResetEmail(cleanEmail, token, user.name || undefined)

    if (!emailResult.success) {
      console.error("[Forgot Password] Failed to send email:", emailResult.error)
      return NextResponse.json(
        { error: emailResult.error || "Failed to send reset email. Please ensure SMTP is configured." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been dispatched.",
    })
  } catch (error: any) {
    console.error("[Forgot Password Error]:", error)
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}

