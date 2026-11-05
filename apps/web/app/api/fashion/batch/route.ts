/**
 * Fashion Batch API
 * POST /api/fashion/batch - apply one action to many fashion items at once
 */

import { NextRequest, NextResponse } from "next/server"
import { db, fashionItems } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditDelete } from "@/lib/audit"
import { deleteFromCloudinary } from "@/lib/cloudinary"
import { and, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const batchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: z.array(z.string().uuid()).min(1).max(200) }),
  z.object({
    action: z.literal("set_status"),
    ids: z.array(z.string().uuid()).min(1).max(200),
    status: z.enum(["wardrobe", "wishlist", "sold", "donated"]),
  }),
  z.object({
    action: z.literal("set_condition"),
    ids: z.array(z.string().uuid()).min(1).max(200),
    condition: z.enum(["new", "good", "fair", "needs_repair", "needs_wash"]),
  }),
  z.object({
    action: z.literal("add_tags"),
    ids: z.array(z.string().uuid()).min(1).max(200),
    tags: z.array(z.string().trim().min(1)).min(1).max(20),
  }),
  z.object({
    action: z.literal("mark_worn"),
    ids: z.array(z.string().uuid()).min(1).max(200),
    date: dateString.optional(),
  }),
])

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const data = batchSchema.parse(await request.json())

    const scope = and(
      inArray(fashionItems.id, data.ids),
      eq(fashionItems.workspaceId, context.workspaceId),
      eq(fashionItems.userId, context.userId)
    )

    if (data.action === "delete") {
      const existing = await db.select().from(fashionItems).where(scope)

      for (const item of existing) {
        for (const url of [item.imageUrl, ...(item.images ?? [])]) {
          if (!url) continue
          try {
            await deleteFromCloudinary(url)
          } catch (error) {
            console.error("[Fashion Batch API] Error deleting image:", error)
          }
        }
      }

      await db.delete(fashionItems).where(scope)
      for (const item of existing) {
        await auditDelete(context, "fashion_item", item.id, item)
      }
      return NextResponse.json({ success: true, ids: existing.map((i) => i.id) })
    }

    if (data.action === "add_tags") {
      const existing = await db.select().from(fashionItems).where(scope)
      const updated = []
      for (const item of existing) {
        const tags = Array.from(new Set([...(item.tags ?? []), ...data.tags]))
        const [row] = await db
          .update(fashionItems)
          .set({ tags, updatedAt: new Date() })
          .where(eq(fashionItems.id, item.id))
          .returning()
        updated.push(row)
      }
      return NextResponse.json({ success: true, items: updated })
    }

    let set: Record<string, unknown>
    switch (data.action) {
      case "set_status":
        set = { status: data.status }
        break
      case "set_condition":
        set = { condition: data.condition }
        break
      case "mark_worn":
        set = {
          wearCount: sql`COALESCE(${fashionItems.wearCount}, 0) + 1`,
          lastWornDate: data.date ?? new Date().toISOString().split("T")[0],
        }
        break
    }

    const updated = await db
      .update(fashionItems)
      .set({ ...set, updatedAt: new Date() })
      .where(scope)
      .returning()

    return NextResponse.json({ success: true, items: updated })
  } catch (error) {
    console.error("[Fashion Batch API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to apply batch action" }, { status: 500 })
  }
}
