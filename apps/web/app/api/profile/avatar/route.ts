/**
 * Profile Avatar Upload API Route
 * Handles user profile avatar uploads to Cloudinary
 */

import { NextRequest, NextResponse } from "next/server"
import { db, users } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"
import { eq } from "drizzle-orm"

/**
 * POST /api/profile/avatar - Upload profile avatar
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const formData = await request.formData()
    const file = formData.get("avatar") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be less than 5MB" },
        { status: 400 }
      )
    }
    
    // Get existing user to delete old avatar
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
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
        console.error("[Avatar Upload] Error deleting old avatar:", error)
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
    console.error("[Avatar Upload] Error:", error)
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/avatar - Delete profile avatar
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    // Get existing user
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // Delete from Cloudinary if exists
    if (existing.image) {
      try {
        await deleteFromCloudinary(existing.image)
      } catch (error) {
        console.error("[Avatar Delete] Error deleting from Cloudinary:", error)
      }
    }
    
    // Update user profile
    await db
      .update(users)
      .set({
        image: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, context.userId))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Avatar Delete] Error:", error)
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    )
  }
}
