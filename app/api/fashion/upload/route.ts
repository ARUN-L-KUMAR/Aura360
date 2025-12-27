/**
 * Fashion Image Upload API Route
 * Handles image uploads to Cloudinary
 */

import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { uploadToCloudinary } from "@/lib/cloudinary"

/**
 * POST /api/fashion/upload - Upload fashion item image
 */
export async function POST(request: NextRequest) {
  try {
    await getWorkspaceContext() // Verify authentication
    
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(buffer, {
      folder: "fashion",
      resource_type: "image",
    })
    
    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("[Fashion Upload API] Error:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}
