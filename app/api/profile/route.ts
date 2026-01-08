/**
 * Profile API Route
 * Handles user profile updates
 */

import { NextRequest, NextResponse } from "next/server"
import { db, users } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditUpdate } from "@/lib/audit"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
})

/**
 * GET /api/profile - Get current user profile
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.name,
        phoneNumber: users.phoneNumber,
        bio: users.bio,
        avatarUrl: users.image,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1)
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error("[Profile API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile - Update user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = updateProfileSchema.parse(body)
    
    // Get existing user
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // Map frontend field names to database field names
    const updateData: any = {
      updatedAt: new Date(),
    }
    if (data.fullName !== undefined) updateData.name = data.fullName
    if (data.avatarUrl !== undefined) updateData.image = data.avatarUrl
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.email !== undefined) updateData.email = data.email
    
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, context.userId))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.name,
        phoneNumber: users.phoneNumber,
        bio: users.bio,
        avatarUrl: users.image,
        updatedAt: users.updatedAt,
      })
    
    // Audit log with full user object
    const existingForAudit = {
      ...existing,
      fullName: existing.name,
      avatarUrl: existing.image,
    }
    const updatedForAudit = {
      ...updated,
      name: data.fullName || existing.name,
      image: data.avatarUrl || existing.image,
      emailVerified: existing.emailVerified,
      password: existing.password,
      createdAt: existing.createdAt,
    }
    await auditUpdate(context, "user", context.userId, existingForAudit, updatedForAudit)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Profile API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profile/avatar - Upload profile avatar
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }
    
    // Get existing user to delete old avatar
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1)
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(buffer, {
      folder: "avatars",
      resource_type: "image",
    })
    
    // Delete old avatar if exists
    if (existing?.image) {
      try {
        await deleteFromCloudinary(existing.image)
      } catch (error) {
        console.error("[Profile API] Error deleting old avatar:", error)
      }
    }
    
    // Update user profile
    const [updated] = await db
      .update(users)
      .set({
        image: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, context.userId))
      .returning({
        id: users.id,
        avatarUrl: users.image,
      })
    
    return NextResponse.json({ avatarUrl: updated.avatarUrl })
  } catch (error) {
    console.error("[Profile API] Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}
