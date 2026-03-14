/**
 * Profile Cover Image Upload API Route
 * Handles user profile cover image uploads to Cloudinary
 */

import { NextRequest, NextResponse } from "next/server"
import { db, users } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"
import { eq } from "drizzle-orm"

/**
 * POST /api/profile/cover - Upload profile cover image
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const formData = await request.formData()
    const file = formData.get("cover") as File
    
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
    
    // Validate file size (10MB max for covers)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be less than 10MB" },
        { status: 400 }
      )
    }
    
    // Get existing user to delete old cover
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
      folder: "covers",
      resource_type: "image",
    })
    
    // Delete old cover if exists
    if (existing?.coverImage) {
      try {
        await deleteFromCloudinary(existing.coverImage)
      } catch (error) {
        console.error("[Cover Upload] Error deleting old cover:", error)
      }
    }
    
    // Update user profile
    const [updated] = await db
      .update(users)
      .set({
        coverImage: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, context.userId))
      .returning({
        id: users.id,
        coverUrl: users.coverImage,
      })
    
    return NextResponse.json({ coverUrl: updated.coverUrl })
  } catch (error) {
    console.error("[Cover Upload] Error:", error)
    return NextResponse.json(
      { error: "Failed to upload cover image" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/cover - Delete profile cover image
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
    if (existing.coverImage) {
      try {
        await deleteFromCloudinary(existing.coverImage)
      } catch (error) {
        console.error("[Cover Delete] Error deleting from Cloudinary:", error)
      }
    }
    
    // Update user profile
    await db
      .update(users)
      .set({
        coverImage: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, context.userId))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Cover Delete] Error:", error)
    return NextResponse.json(
      { error: "Failed to delete cover image" },
      { status: 500 }
    )
  }
}
