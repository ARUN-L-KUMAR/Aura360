/**
 * Move API Route
 * Handles moving items between modules (e.g., Notes to Saved)
 */

import { NextRequest, NextResponse } from "next/server"
import { db, notes, savedItems, transactions, fitness, food, fashionItems, skincare, timeLogs } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditDelete } from "@/lib/audit"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { productInfoOf, productStatusOf } from "@/lib/saved/product"

const moveItemSchema = z.object({
  sourceModule: z.enum(["notes", "saved", "finance", "fitness", "food", "fashion", "skincare", "time"]),
  targetModule: z.enum(["notes", "saved", "finance", "fitness", "food", "fashion", "skincare", "time"]),
  itemId: z.string().uuid(),
  action: z.enum(["move", "copy"]).optional().default("move"),
})

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const { sourceModule, targetModule, itemId, action } = moveItemSchema.parse(body)

    if (sourceModule === targetModule) {
      return NextResponse.json({ error: "Source and target modules are the same" }, { status: 400 })
    }

    // 1. Fetch source item
    let sourceItem: any
    if (sourceModule === "notes") {
      [sourceItem] = await db.select().from(notes).where(and(eq(notes.id, itemId), eq(notes.workspaceId, context.workspaceId), eq(notes.userId, context.userId))).limit(1)
    } else if (sourceModule === "saved") {
      [sourceItem] = await db.select().from(savedItems).where(and(eq(savedItems.id, itemId), eq(savedItems.workspaceId, context.workspaceId), eq(savedItems.userId, context.userId))).limit(1)
    } else if (sourceModule === "finance") {
      [sourceItem] = await db.select().from(transactions).where(and(eq(transactions.id, itemId), eq(transactions.workspaceId, context.workspaceId), eq(transactions.userId, context.userId))).limit(1)
    } else if (sourceModule === "fitness") {
      [sourceItem] = await db.select().from(fitness).where(and(eq(fitness.id, itemId), eq(fitness.workspaceId, context.workspaceId), eq(fitness.userId, context.userId))).limit(1)
    } else if (sourceModule === "food") {
      [sourceItem] = await db.select().from(food).where(and(eq(food.id, itemId), eq(food.workspaceId, context.workspaceId), eq(food.userId, context.userId))).limit(1)
    } else if (sourceModule === "fashion") {
      [sourceItem] = await db.select().from(fashionItems).where(and(eq(fashionItems.id, itemId), eq(fashionItems.workspaceId, context.workspaceId), eq(fashionItems.userId, context.userId))).limit(1)
    } else if (sourceModule === "skincare") {
      [sourceItem] = await db.select().from(skincare).where(and(eq(skincare.id, itemId), eq(skincare.workspaceId, context.workspaceId), eq(skincare.userId, context.userId))).limit(1)
    } else if (sourceModule === "time") {
      [sourceItem] = await db.select().from(timeLogs).where(and(eq(timeLogs.id, itemId), eq(timeLogs.workspaceId, context.workspaceId), eq(timeLogs.userId, context.userId))).limit(1)
    }

    if (!sourceItem) {
      return NextResponse.json({ error: "Item not found in source module" }, { status: 404 })
    }

    // 2. Create target item
    let newItem: any
    const baseData = {
      workspaceId: context.workspaceId,
      userId: context.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (targetModule === "saved") {
      const validTypes = ["article", "video", "product", "recipe", "other"]
      const sourceType = sourceItem.category || sourceItem.type || "other"
      // A fashion item is a product: keep it that way in Saved, with its wishlist / owned state and price.
      const fromFashion = sourceModule === "fashion"
      const targetType = fromFashion ? "product" : validTypes.includes(sourceType.toLowerCase()) ? sourceType.toLowerCase() : "other"
      const fashionPrice = fromFashion ? Number.parseFloat(sourceItem.price) : Number.NaN
      const fashionStore = sourceItem.metadata?.store ?? sourceItem.metadata?.platform

      const [item] = await db.insert(savedItems).values({
        ...baseData,
        title: sourceItem.title || sourceItem.name || sourceItem.productName || sourceItem.activity || "Moved Item",
        description: sourceItem.content || sourceItem.description || sourceItem.notes || "",
        tags: fromFashion ? [...(sourceItem.tags || []), "Fashion"] : sourceItem.tags || [],
        type: targetType as any,
        url: sourceItem.url || sourceItem.metadata?.url || sourceItem.metadata?.buyingLink || sourceItem.buyingLink || null,
        imageUrl: sourceItem.imageUrl || sourceItem.metadata?.imageUrl || null,
        isFavorite: sourceItem.isPinned || sourceItem.isFavorite || false,
        metadata: fromFashion
          ? {
              ...(sourceItem.metadata || {}),
              type: "product",
              category: "Fashion",
              status: sourceItem.status === "wardrobe" ? "owned" : "wishlist",
              ...(Number.isFinite(fashionPrice) && fashionPrice > 0 ? { price: fashionPrice, currency: sourceItem.metadata?.currency ?? "INR" } : {}),
              ...(fashionStore ? { store: fashionStore } : {}),
            }
          : sourceItem.metadata || {},
      }).returning()
      newItem = item
    } else if (targetModule === "notes") {
      const [note] = await db.insert(notes).values({
        ...baseData,
        title: sourceItem.title || sourceItem.name || sourceItem.productName || sourceItem.activity || "Moved Item",
        content: sourceItem.content || sourceItem.description || sourceItem.notes || "",
        tags: sourceItem.tags || [],
        isPinned: sourceItem.isPinned || sourceItem.isFavorite || false,
        category: sourceItem.category || sourceItem.type || "Other",
        metadata: sourceItem.metadata || {},
      }).returning()
      newItem = note
    } else if (targetModule === "finance") {
      const [tx] = await db.insert(transactions).values({
        ...baseData,
        date: sourceItem.date || new Date().toISOString().split('T')[0],
        amount: sourceItem.amount || sourceItem.price || "0",
        description: sourceItem.title || sourceItem.name || sourceItem.description || "",
        category: sourceItem.category || "Other",
        type: sourceItem.type === "income" ? "income" : "expense",
        paymentMethod: "other",
        metadata: sourceItem.metadata || {},
      }).returning()
      newItem = tx
    } else if (targetModule === "fitness") {
      const [fit] = await db.insert(fitness).values({
        ...baseData,
        date: sourceItem.date || new Date().toISOString().split('T')[0],
        type: "workout",
        workoutType: sourceItem.category || "other",
        notes: sourceItem.content || sourceItem.description || sourceItem.notes || "",
        metadata: sourceItem.metadata || {},
      }).returning()
      newItem = fit
    } else if (targetModule === "food") {
      const [f] = await db.insert(food).values({
        ...baseData,
        date: sourceItem.date || new Date().toISOString().split('T')[0],
        mealType: "snack",
        foodName: sourceItem.title || sourceItem.name || "Moved Food",
        notes: sourceItem.content || sourceItem.description || sourceItem.notes || "",
        metadata: sourceItem.metadata || {},
      }).returning()
      newItem = f
    } else if (targetModule === "fashion") {
      // A saved product keeps its wishlist / owned state and price; anything else lands in the wardrobe as before.
      const savedStatus = sourceModule === "saved" ? productStatusOf(sourceItem) : null
      const savedPrice = savedStatus ? productInfoOf(sourceItem.metadata).price : null
      const [item] = await db.insert(fashionItems).values({
        ...baseData,
        name: sourceItem.title || sourceItem.name || "Moved Item",
        description: sourceItem.content || sourceItem.description || sourceItem.notes || "",
        category: sourceItem.category || "other",
        status: savedStatus === "wishlist" ? "wishlist" : "wardrobe",
        price: savedPrice ? savedPrice.toString() : undefined,
        imageUrl: sourceItem.imageUrl || sourceItem.metadata?.imageUrl || null,
        metadata: {
          ...(sourceItem.metadata || {}),
          // Lets a later chat paste of the same link see it is already there.
          ...(sourceModule === "saved" && sourceItem.url ? { buyingLink: sourceItem.url } : {}),
        },
      }).returning()
      newItem = item
    } else if (targetModule === "skincare") {
      const [skin] = await db.insert(skincare).values({
        ...baseData,
        productName: sourceItem.title || sourceItem.name || sourceItem.productName || "Moved Product",
        category: sourceItem.category || "other",
        notes: sourceItem.content || sourceItem.description || sourceItem.notes || "",
        imageUrl: sourceItem.imageUrl || sourceItem.metadata?.imageUrl || null,
        metadata: sourceItem.metadata || {},
      }).returning()
      newItem = skin
    } else if (targetModule === "time") {
      const [time] = await db.insert(timeLogs).values({
        ...baseData,
        date: sourceItem.date || new Date().toISOString().split('T')[0],
        activity: sourceItem.title || sourceItem.name || sourceItem.activity || "Moved Activity",
        duration: sourceItem.duration || 0,
        category: sourceItem.category || "other",
        description: sourceItem.content || sourceItem.description || sourceItem.notes || "",
        metadata: sourceItem.metadata || {},
      }).returning()
      newItem = time
    }

    await auditCreate(context, `${targetModule}_item` as any, newItem.id, { 
      action,
      movedFrom: sourceModule, 
      ...newItem 
    })

    // 3. Delete source item (scoped with tenant protection)
    if (action === "move") {
      const matchScope = (table: any) =>
        and(
          eq(table.id, itemId),
          eq(table.workspaceId, context.workspaceId),
          eq(table.userId, context.userId)
        )

      if (sourceModule === "notes") {
        await db.delete(notes).where(matchScope(notes))
      } else if (sourceModule === "saved") {
        await db.delete(savedItems).where(matchScope(savedItems))
      } else if (sourceModule === "finance") {
        await db.delete(transactions).where(matchScope(transactions))
      } else if (sourceModule === "fitness") {
        await db.delete(fitness).where(matchScope(fitness))
      } else if (sourceModule === "food") {
        await db.delete(food).where(matchScope(food))
      } else if (sourceModule === "fashion") {
        await db.delete(fashionItems).where(matchScope(fashionItems))
      } else if (sourceModule === "skincare") {
        await db.delete(skincare).where(matchScope(skincare))
      } else if (sourceModule === "time") {
        await db.delete(timeLogs).where(matchScope(timeLogs))
      }

      await auditDelete(context, `${sourceModule}_item` as any, itemId, sourceItem)
    }

    return NextResponse.json({ success: true, newItem, action })
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
