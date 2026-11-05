/**
 * Cloudinary Configuration
 * Replaces Supabase Storage for file uploads
 */

import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

/**
 * Upload image to Cloudinary
 * 
 * @param file - File data (base64 or buffer)
 * @param folder - Cloudinary folder path
 * @param options - Additional upload options
 */
export async function uploadImage(
  file: string | Buffer,
  folder: string = "aura360",
  options: {
    public_id?: string
    transformation?: any
    tags?: string[]
  } = {}
) {
  try {
    // Convert buffer to base64 data URL if needed
    let fileData: string
    if (Buffer.isBuffer(file)) {
      fileData = `data:image/png;base64,${file.toString('base64')}`
    } else {
      fileData = file
    }

    const result = await cloudinary.uploader.upload(fileData, {
      folder,
      resource_type: "auto",
      ...options,
    })

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    }
  } catch (error) {
    console.error("[Cloudinary Upload Error]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return {
      success: result.result === "ok",
      message: result.result,
    }
  } catch (error) {
    console.error("[Cloudinary Delete Error]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    }
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImages(
  files: Array<string | Buffer>,
  folder: string = "aura360"
) {
  const results = await Promise.allSettled(
    files.map((file) => uploadImage(file, folder))
  )

  return results.map((result, index) => ({
    index,
    ...(result.status === "fulfilled" ? result.value : { success: false, error: "Upload failed" }),
  }))
}

/**
 * Transformation presets
 */
export const transformations = {
  thumbnail: {
    width: 200,
    height: 200,
    crop: "fill",
    gravity: "auto",
    quality: "auto:good",
  },
  fashionItem: {
    width: 800,
    height: 1000,
    crop: "fit",
    quality: "auto:best",
  },
  avatar: {
    width: 256,
    height: 256,
    crop: "fill",
    gravity: "face",
    quality: "auto:good",
  },
  foodPhoto: {
    width: 600,
    height: 600,
    crop: "fill",
    gravity: "auto",
    quality: "auto:good",
  },
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedImageUrl(
  publicId: string,
  preset: keyof typeof transformations = "thumbnail"
) {
  return cloudinary.url(publicId, {
    ...transformations[preset],
    fetch_format: "auto",
  })
}

/**
 * Upload fashion item image
 */
export async function uploadFashionImage(
  file: string | Buffer,
  itemId: string,
  options?: { tags?: string[] }
) {
  return uploadImage(file, "aura360/fashion", {
    public_id: `fashion_${itemId}_${Date.now()}`,
    transformation: transformations.fashionItem,
    ...options,
  })
}

/**
 * Upload food photo
 */
export async function uploadFoodPhoto(
  file: string | Buffer,
  mealId: string,
  options?: { tags?: string[] }
) {
  return uploadImage(file, "aura360/food", {
    public_id: `food_${mealId}_${Date.now()}`,
    transformation: transformations.foodPhoto,
    ...options,
  })
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(
  file: string | Buffer,
  userId: string
) {
  return uploadImage(file, "aura360/avatars", {
    public_id: `avatar_${userId}`,
    transformation: transformations.avatar,
  })
}

/**
 * Helper for API routes - upload to Cloudinary and return URL
 */
export async function uploadToCloudinary(
  file: Buffer,
  options: { folder?: string; resource_type?: string } = {}
): Promise<string> {
  const result = await uploadImage(file, options.folder || "aura360")
  if (!result.success || !result.url) {
    throw new Error(result.error || "Upload failed")
  }
  return result.url
}

/**
 * Helper for API routes - delete from Cloudinary by URL
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
  // Extract public_id from URL
  const matches = url.match(/\/([^\/]+)\.[^.]+$/)
  if (!matches) return
  
  const publicId = matches[1]
  await deleteImage(publicId)
}

export default cloudinary
