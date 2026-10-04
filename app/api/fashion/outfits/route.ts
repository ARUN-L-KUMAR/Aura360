/**
 * Fashion Outfits API
 * GET    /api/fashion/outfits           - list saved outfits
 * POST   /api/fashion/outfits           - save an outfit
 * PATCH  /api/fashion/outfits?id=xxx    - rename/edit, or log it as worn ({ action: "log_worn" })
 * DELETE /api/fashion/outfits?id=xxx    - delete an outfit
 */

import { NextRequest, NextResponse } from "next/server"
import { db, fashionItems, fashionOutfits } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  itemIds: z.array(z.string().uuid()).min(1).max(30),
  occasion: z.string().optional(),
  vibe: z.string().optional(),
  notes: z.string().optional(),
})

const patchSchema = z.union([
  z.object({ action: z.literal("log_worn"), date: dateString.optional() }),
  z.object({
    action: z.literal("update").optional(),
    name: z.string().trim().min(1).max(120).optional(),
    notes: z.string().optional(),
    occasion: z.string().optional(),
  }),
])

function ownedBy(context: { workspaceId: string; userId: string }, id: string) {
  return and(
    eq(fashionOutfits.id, id),
    eq(fashionOutfits.workspaceId, context.workspaceId),
    eq(fashionOutfits.userId, context.userId)
  )
}

export async function GET() {
  try {
    const context = await getWorkspaceContext()
    const outfits = await db
      .select()
      .from(fashionOutfits)
      .where(
        and(
          eq(fashionOutfits.workspaceId, context.workspaceId),
          eq(fashionOutfits.userId, context.userId)
        )
      )
      .orderBy(desc(fashionOutfits.createdAt))
    return NextResponse.json(outfits)
  } catch (error) {
    console.error("[Fashion Outfits API] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch outfits" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const data = createSchema.parse(await request.json())
    const itemIds = Array.from(new Set(data.itemIds))

    // Only allow items that belong to this user
    const owned = await db
      .select({ id: fashionItems.id })
      .from(fashionItems)
      .where(
        and(
          inArray(fashionItems.id, itemIds),
          eq(fashionItems.workspaceId, context.workspaceId),
          eq(fashionItems.userId, context.userId)
        )
      )
    if (owned.length !== itemIds.length) {
      return NextResponse.json({ error: "One or more items were not found" }, { status: 400 })
    }

    const [outfit] = await db
      .insert(fashionOutfits)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        name: data.name,
        itemIds,
        occasion: data.occasion,
        vibe: data.vibe,
        notes: data.notes,
        wornDates: [],
      })
      .returning()

    return NextResponse.json(outfit, { status: 201 })
  } catch (error) {
    console.error("[Fashion Outfits API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to save outfit" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })

    const data = patchSchema.parse(await request.json())

    const [existing] = await db.select().from(fashionOutfits).where(ownedBy(context, id)).limit(1)
    if (!existing) return NextResponse.json({ error: "Outfit not found" }, { status: 404 })

    if (data.action === "log_worn") {
      const date = data.date ?? new Date().toISOString().split("T")[0]
      const alreadyLogged = (existing.wornDates ?? []).includes(date)
      if (alreadyLogged) {
        return NextResponse.json({ outfit: existing, items: [], alreadyLogged: true })
      }

      const [outfit] = await db
        .update(fashionOutfits)
        .set({
          wearCount: (existing.wearCount ?? 0) + 1,
          wornDates: [...(existing.wornDates ?? []), date].sort(),
          lastWornDate: !existing.lastWornDate || existing.lastWornDate < date ? date : existing.lastWornDate,
          updatedAt: new Date(),
        })
        .where(ownedBy(context, id))
        .returning()

      // Every piece in the outfit counts as worn too
      const items = await db
        .update(fashionItems)
        .set({
          wearCount: sql`COALESCE(${fashionItems.wearCount}, 0) + 1`,
          lastWornDate: date,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(fashionItems.id, existing.itemIds),
            eq(fashionItems.workspaceId, context.workspaceId),
            eq(fashionItems.userId, context.userId)
          )
        )
        .returning()

      return NextResponse.json({ outfit, items, alreadyLogged: false })
    }

    const { name, notes, occasion } = data
    const [outfit] = await db
      .update(fashionOutfits)
      .set({ name, notes, occasion, updatedAt: new Date() })
      .where(ownedBy(context, id))
      .returning()
    return NextResponse.json({ outfit })
  } catch (error) {
    console.error("[Fashion Outfits API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update outfit" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })

    const deleted = await db.delete(fashionOutfits).where(ownedBy(context, id)).returning({ id: fashionOutfits.id })
    if (deleted.length === 0) return NextResponse.json({ error: "Outfit not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Fashion Outfits API] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete outfit" }, { status: 500 })
  }
}
