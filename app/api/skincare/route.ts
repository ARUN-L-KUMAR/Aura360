/**
 * Skincare API Route
 * Handles CRUD operations for skincare products
 */

import { NextRequest, NextResponse } from "next/server"
import { db, skincare } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"

const createSkincareSchema = z.object({
  productName: z.string(),
  brand: z.string().optional(),
  category: z.string(),
  routineTime: z.enum(["morning", "evening", "both"]).optional(),
  frequency: z.string().optional(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  price: z.number().optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
})

const updateSkincareSchema = createSkincareSchema.partial()

/**
 * GET /api/skincare - Fetch all skincare products
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const products = await db
      .select()
      .from(skincare)
      .where(
        and(
          eq(skincare.workspaceId, context.workspaceId),
          eq(skincare.userId, context.userId)
        )
      )
      .orderBy(desc(skincare.createdAt))
    
    return NextResponse.json(products)
  } catch (error) {
    console.error("[Skincare API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch skincare products" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skincare - Create new skincare product
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = createSkincareSchema.parse(body)
    
    const [product] = await db
      .insert(skincare)
      .values({
        ...context,
        ...data,
        price: data.price?.toString(),
      })
      .returning()
    
    // Audit log
    await auditCreate(context, "skincare", product.id, data)
    
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("[Skincare API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create skincare product" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/skincare?id=xxx - Update skincare product
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
    const data = updateSkincareSchema.parse(body)
    
    // Get existing product
    const [existing] = await db
      .select()
      .from(skincare)
      .where(
        and(
          eq(skincare.id, id),
          eq(skincare.workspaceId, context.workspaceId),
          eq(skincare.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Skincare product not found" }, { status: 404 })
    }
    
    const [updated] = await db
      .update(skincare)
      .set({
        ...data,
        price: data.price?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(skincare.id, id))
      .returning()
    
    // Audit log
    await auditUpdate(context, "skincare", id, existing, updated)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Skincare API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update skincare product" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/skincare?id=xxx - Delete skincare product
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    // Get existing product
    const [existing] = await db
      .select()
      .from(skincare)
      .where(
        and(
          eq(skincare.id, id),
          eq(skincare.workspaceId, context.workspaceId),
          eq(skincare.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Skincare product not found" }, { status: 404 })
    }
    
    await db
      .delete(skincare)
      .where(eq(skincare.id, id))
    
    // Audit log
    await auditDelete(context, "skincare", id, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Skincare API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete skincare product" },
      { status: 500 }
    )
  }
}
