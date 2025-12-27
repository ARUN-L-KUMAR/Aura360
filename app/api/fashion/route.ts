/**
 * Fashion API Route
 * Handles CRUD operations for fashion items with Cloudinary image upload
 */

import { NextRequest, NextResponse } from "next/server"
import { db, fashionItems } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"

const createFashionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.number().optional(),
  purchaseDate: z.string().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["wardrobe", "wishlist", "sold", "donated"]).optional(),
  wearCount: z.number().optional(),
  lastWornDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  notes: z.string().optional(),
})

const updateFashionSchema = createFashionSchema.partial()

/**
 * GET /api/fashion - Fetch all fashion items
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const items = await db
      .select()
      .from(fashionItems)
      .where(
        and(
          eq(fashionItems.workspaceId, context.workspaceId),
          eq(fashionItems.userId, context.userId)
        )
      )
      .orderBy(desc(fashionItems.createdAt))
    
    return NextResponse.json(items)
  } catch (error) {
    console.error("[Fashion API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch fashion items" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/fashion - Create new fashion item
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = createFashionSchema.parse(body)
    
    const [item] = await db
      .insert(fashionItems)
      .values({
        ...context,
        ...data,
        price: data.price?.toString(),
      })
      .returning()
    
    // Audit log
    await auditCreate(context, "fashion_item", item.id, data)
    
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("[Fashion API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create fashion item" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/fashion?id=xxx - Update fashion item
 */
export async function PATCH(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    const body = await request.json()
    const data = updateFashionSchema.parse(body)
    
    // Get existing item
    const [existing] = await db
      .select()
      .from(fashionItems)
      .where(
        and(
          eq(fashionItems.id, id),
          eq(fashionItems.workspaceId, context.workspaceId),
          eq(fashionItems.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Fashion item not found" }, { status: 404 })
    }
    
    const [updated] = await db
      .update(fashionItems)
      .set({
        ...data,
        price: data.price?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(fashionItems.id, id))
      .returning()
    
    // Audit log
    await auditUpdate(context, "fashion_item", id, existing, updated)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Fashion API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update fashion item" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/fashion?id=xxx - Delete fashion item
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    // Get existing item
    const [existing] = await db
      .select()
      .from(fashionItems)
      .where(
        and(
          eq(fashionItems.id, id),
          eq(fashionItems.workspaceId, context.workspaceId),
          eq(fashionItems.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Fashion item not found" }, { status: 404 })
    }
    
    // Delete images from Cloudinary if they exist
    if (existing.imageUrl) {
      try {
        await deleteFromCloudinary(existing.imageUrl)
      } catch (error) {
        console.error("[Fashion API] Error deleting image:", error)
      }
    }
    
    if (existing.images && existing.images.length > 0) {
      for (const imageUrl of existing.images) {
        try {
          await deleteFromCloudinary(imageUrl)
        } catch (error) {
          console.error("[Fashion API] Error deleting image:", error)
        }
      }
    }
    
    await db
      .delete(fashionItems)
      .where(eq(fashionItems.id, id))
    
    // Audit log
    await auditDelete(context, "fashion_item", id, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Fashion API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete fashion item" },
      { status: 500 }
    )
  }
}
