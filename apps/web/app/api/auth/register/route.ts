/**
 * User Registration API
 * Creates user + workspace + sends verification email
 */

import { NextResponse } from "next/server"
import { db, users, workspaces, verificationTokens } from "@/lib/db"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendVerificationEmail } from "@/lib/resend"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user (emailVerified is null by default)
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: name || email.split("@")[0],
        password: hashedPassword,
        // emailVerified: null - user must verify email
      })
      .returning()

    // Create default workspace
    const slug = `${email.split("@")[0]}-${Date.now()}`
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: `${newUser.name}'s Workspace`,
        slug,
        ownerId: newUser.id,
        settings: {
          currency: "USD",
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
        },
      })
      .returning()

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store verification token
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
    })

    // Send verification email
    const emailResult = await sendVerificationEmail(email, token, newUser.name || undefined)

    if (!emailResult.success) {
      console.error("[Registration] Failed to send verification email:", emailResult.error)
      // Don't fail registration if email fails - user can resend
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Please check your email to verify.",
      userId: newUser.id,
      workspaceId: workspace.id,
    })
  } catch (error) {
    console.error("[Registration Error]", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
