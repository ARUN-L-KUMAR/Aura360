import { NextRequest, NextResponse } from "next/server"
import { db, users, verificationTokens } from "@/lib/db"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { z } from "zod"

const resetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = resetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { token, newPassword } = parsed.data

    // 1. Locate the token
    const [tokenRecord] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1)

    if (!tokenRecord) {
      return NextResponse.json({ error: "Invalid or expired password reset link" }, { status: 400 })
    }

    if (new Date() > tokenRecord.expires) {
      await db.delete(verificationTokens).where(eq(verificationTokens.token, token))
      return NextResponse.json({ error: "Password reset link has expired. Please request a new one." }, { status: 400 })
    }

    const email = tokenRecord.identifier.replace(/^reset:/, "")

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 3. Update user password
    const [updatedUser] = await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning({ id: users.id })

    if (!updatedUser) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 })
    }

    // 4. Remove used token
    await db.delete(verificationTokens).where(eq(verificationTokens.token, token))

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    })
  } catch (error: any) {
    console.error("[Reset Password Error]:", error)
    return NextResponse.json({ error: error?.message || "Failed to reset password" }, { status: 500 })
  }
}

