import { NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { users, verificationTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { sendVerificationEmail } from "@/lib/resend"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find the user
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email address" },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This account has already been verified. You can log in directly." },
        { status: 400 }
      )
    }

    // Delete existing verification tokens for this email
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, normalizedEmail))

    // Generate new token valid for 24 hours
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.insert(verificationTokens).values({
      identifier: normalizedEmail,
      token,
      expires,
    })

    const emailResult = await sendVerificationEmail(
      normalizedEmail,
      token,
      user.name || undefined
    )

    if (!emailResult.success) {
      console.error("[Resend Verification] Failed to send email:", emailResult.error)
      return NextResponse.json(
        { error: "Failed to send verification email. Please check your SMTP settings." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    })
  } catch (error) {
    console.error("[Resend Verification Error]", error)
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    )
  }
}

