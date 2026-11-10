import { NextRequest, NextResponse } from "next/server"
import { uploadImage } from "@/lib/cloudinary"
import { getWorkspaceContext } from "@/lib/auth-helpers"

/**
 * Upload image to Cloudinary for fashion items
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const context = await getWorkspaceContext()
    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { image, folder = "fashion" } = body

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      )
    }

    // Upload to Cloudinary
    const result = await uploadImage(image, folder, {
      tags: ["fashion", context.userId],
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to upload image" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
    })
  } catch (error) {
    console.error("[Fashion Image Upload Error]", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}
