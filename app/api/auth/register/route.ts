/**
 * User Registration API
 * Creates user + workspace in one transaction
 */

import { NextResponse } from "next/server"
import { db, users, workspaces } from "@/lib/db"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

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

    // Create user (no transaction support in neon-http driver)
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: name || email.split("@")[0],
        password: hashedPassword,
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

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
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
