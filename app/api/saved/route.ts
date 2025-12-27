/**
 * Saved Items API Route
 * Handles CRUD operations for saved items (bookmarks)
 */

import { NextRequest, NextResponse } from "next/server"
import { db, savedItems } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"

const createSavedItemSchema = z.object({
  type: z.enum(["article", "video", "product", "recipe", "other"]),
  title: z.string(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
})

const updateSavedItemSchema = createSavedItemSchema.partial()

/**
 * GET /api/saved - Fetch all saved items
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const items = await db
      .select()
      .from(savedItems)
      .where(
        and(
          eq(savedItems.workspaceId, context.workspaceId),
          eq(savedItems.userId, context.userId)
        )
      )
      .orderBy(desc(savedItems.isFavorite), desc(savedItems.createdAt))
    
    return NextResponse.json(items)
  } catch (error) {
    console.error("[Saved API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch saved items" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/saved - Create new saved item
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = createSavedItemSchema.parse(body)
    
    const [item] = await db
      .insert(savedItems)
      .values({
        ...context,
        ...data,
      })
      .returning()
    
    // Audit log
    await auditCreate(context, "saved_item", item.id, data)
    
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("[Saved API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create saved item" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/saved?id=xxx - Update saved item
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
    const data = updateSavedItemSchema.parse(body)
    
    // Get existing item
    const [existing] = await db
      .select()
      .from(savedItems)
      .where(
        and(
          eq(savedItems.id, id),
          eq(savedItems.workspaceId, context.workspaceId),
          eq(savedItems.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Saved item not found" }, { status: 404 })
    }
    
    const [updated] = await db
      .update(savedItems)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(savedItems.id, id))
      .returning()
    
    // Audit log
    await auditUpdate(context, "saved_item", id, existing, updated)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Saved API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update saved item" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/saved?id=xxx - Delete saved item
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
      .from(savedItems)
      .where(
        and(
          eq(savedItems.id, id),
          eq(savedItems.workspaceId, context.workspaceId),
          eq(savedItems.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Saved item not found" }, { status: 404 })
    }
    
    await db
      .delete(savedItems)
      .where(eq(savedItems.id, id))
    
    // Audit log
    await auditDelete(context, "saved_item", id, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Saved API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete saved item" },
      { status: 500 }
    )
  }
}
