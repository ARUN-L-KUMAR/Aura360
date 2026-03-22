/**
 * Move API Route
 * Handles moving items between modules (e.g., Notes to Saved)
 */

import { NextRequest, NextResponse } from "next/server"
import { db, notes, savedItems } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditDelete } from "@/lib/audit"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const moveItemSchema = z.object({
  sourceModule: z.enum(["notes", "saved"]),
  targetModule: z.enum(["notes", "saved"]),
  itemId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const { sourceModule, targetModule, itemId } = moveItemSchema.parse(body)

    if (sourceModule === targetModule) {
      return NextResponse.json({ error: "Source and target modules are the same" }, { status: 400 })
    }

    // 1. Fetch source item
    let sourceItem: any
    if (sourceModule === "notes") {
      [sourceItem] = await db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.id, itemId),
            eq(notes.workspaceId, context.workspaceId),
            eq(notes.userId, context.userId)
          )
        )
        .limit(1)
    } else if (sourceModule === "saved") {
      [sourceItem] = await db
        .select()
        .from(savedItems)
        .where(
          and(
            eq(savedItems.id, itemId),
            eq(savedItems.workspaceId, context.workspaceId),
            eq(savedItems.userId, context.userId)
          )
        )
        .limit(1)
    }

    if (!sourceItem) {
      return NextResponse.json({ error: "Item not found in source module" }, { status: 404 })
    }

    // 2. Create target item
    let newItem: any
    if (targetModule === "saved") {
      // Moving from Notes to Saved
      const validTypes = ["article", "video", "product", "recipe", "other"]
      const sourceType = sourceItem.category?.toLowerCase()
      const targetType = validTypes.includes(sourceType) ? sourceType : "other"

      const [item] = await db
        .insert(savedItems)
        .values({
          workspaceId: context.workspaceId,
          userId: context.userId,
          title: sourceItem.title,
          description: sourceItem.content || sourceItem.description || "",
          tags: sourceItem.tags || [],
          type: targetType as any, 
          url: sourceItem.metadata?.url || null,
          imageUrl: sourceItem.metadata?.imageUrl || null,
          isFavorite: sourceItem.isPinned || false,
          metadata: sourceItem.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      newItem = item
      await auditCreate(context, "saved_item", newItem.id, { movedFrom: sourceModule, ...newItem })
    } else if (targetModule === "notes") {
      // Moving from Saved to Notes
      const [note] = await db
        .insert(notes)
        .values({
          workspaceId: context.workspaceId,
          userId: context.userId,
          title: sourceItem.title,
          content: sourceItem.description || "",
          tags: sourceItem.tags || [],
          isPinned: sourceItem.isFavorite || false,
          category: sourceItem.type || "Other",
          metadata: sourceItem.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      newItem = note
      await auditCreate(context, "note", newItem.id, { movedFrom: sourceModule, ...newItem })
    }

    // 3. Delete source item
    if (sourceModule === "notes") {
      await db.delete(notes).where(eq(notes.id, itemId))
      await auditDelete(context, "note", itemId, sourceItem)
    } else if (sourceModule === "saved") {
      await db.delete(savedItems).where(eq(savedItems.id, itemId))
      await auditDelete(context, "saved_item", itemId, sourceItem)
    }

    return NextResponse.json({ success: true, newItem })
  } catch (error) {
    console.error("[Move API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to move item" },
      { status: 500 }
    )
  }
}
