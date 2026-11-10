import { z } from "zod"
import { db, skincare } from "@/lib/db"
import { and, eq, desc, ilike, or } from "drizzle-orm"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import type { AiTool } from "./types"

export const getSkincareRoutine: AiTool = {
  name: "get_skincare_routine",
  description:
    "Fetch user's skincare and grooming routine products, optionally filtered by body part (face/hair/body/oral/general), routine time (morning/evening/both/weekly), or status (owned/need_to_buy/finished).",
  parameters: z.object({
    bodyPart: z
      .enum(["face", "hair", "body", "oral", "general"])
      .optional()
      .describe("Target body part or grooming category"),
    status: z
      .enum(["owned", "need_to_buy", "finished"])
      .optional()
      .describe("Ownership or consumption status"),
    routineTime: z
      .enum(["morning", "evening", "both", "weekly", "optional"])
      .optional()
      .describe("Time of routine"),
    search: z
      .string()
      .optional()
      .describe("Product name or brand search keyword"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(30)
      .describe("Maximum number of products to return (default: 30)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(skincare.workspaceId, ctx.workspaceId),
      eq(skincare.userId, ctx.userId),
    ]

    if (args.bodyPart) {
      conditions.push(eq(skincare.bodyPart, args.bodyPart))
    }
    if (args.status) {
      conditions.push(eq(skincare.status, args.status))
    }
    if (args.routineTime) {
      conditions.push(eq(skincare.routineTime, args.routineTime))
    }
    if (args.search) {
      conditions.push(
        or(
          ilike(skincare.productName, `%${args.search}%`),
          ilike(skincare.brand, `%${args.search}%`)
        )!
      )
    }

    const limit = args.limit ?? 30

    const rows = await db
      .select({
        id: skincare.id,
        productName: skincare.productName,
        brand: skincare.brand,
        category: skincare.category,
        bodyPart: skincare.bodyPart,
        status: skincare.status,
        routineTime: skincare.routineTime,
        routineOrder: skincare.routineOrder,
        frequency: skincare.frequency,
        rating: skincare.rating,
        notes: skincare.notes,
        expiryDate: skincare.expiryDate,
      })
      .from(skincare)
      .where(and(...conditions))
      .orderBy(desc(skincare.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      skincareProducts: rows,
    }
  },
}

export const addSkincareProduct: AiTool = {
  name: "add_skincare_product",
  description: "Add a new skincare or grooming product to the user's routine.",
  parameters: z.object({
    productName: z.string().describe("Name of the product"),
    category: z.string().describe("Product category (e.g. Cleanser, Moisturizer, Serum, Sunscreen, Shampoo)"),
    brand: z.string().optional().describe("Brand name"),
    bodyPart: z.enum(["face", "hair", "body", "oral", "general"]).default("face").describe("Target body part"),
    status: z.enum(["owned", "need_to_buy", "finished"]).default("owned").describe("Ownership status"),
    routineTime: z.enum(["morning", "evening", "both", "weekly", "optional"]).optional().describe("Routine time"),
    frequency: z.string().optional().describe("Frequency (e.g. daily, weekly, 2x daily)"),
    rating: z.number().min(1).max(5).optional().describe("Rating from 1-5"),
    notes: z.string().optional().describe("Additional notes about the product"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(skincare)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        productName: args.productName,
        category: args.category,
        brand: args.brand,
        bodyPart: args.bodyPart ?? "face",
        status: args.status ?? "owned",
        routineTime: args.routineTime,
        frequency: args.frequency,
        rating: args.rating,
        notes: args.notes,
      })
      .returning()

    await auditCreate(ctx, "skincare", row.id, row, { source: "ai_agent" })
    return { success: true, product: row }
  },
}

export const updateSkincareProduct: AiTool = {
  name: "update_skincare_product",
  description: "Update an existing skincare product's routine time, status, rating, frequency, or notes.",
  parameters: z.object({
    id: z.string().describe("Product ID to update"),
    productName: z.string().optional().describe("Updated product name"),
    category: z.string().optional().describe("Updated category"),
    brand: z.string().optional().describe("Updated brand"),
    status: z.enum(["owned", "need_to_buy", "finished"]).optional().describe("Updated ownership status"),
    routineTime: z.enum(["morning", "evening", "both", "weekly", "optional"]).optional().describe("Updated routine slot"),
    frequency: z.string().optional().describe("Usage frequency"),
    rating: z.number().min(1).max(5).optional().describe("Rating from 1-5"),
    notes: z.string().optional().describe("Product notes"),
    expiryDate: z.string().optional().describe("Expiry date in YYYY-MM-DD"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [existing] = await db
      .select()
      .from(skincare)
      .where(and(eq(skincare.id, args.id), eq(skincare.workspaceId, ctx.workspaceId), eq(skincare.userId, ctx.userId)))
      .limit(1)

    if (!existing) {
      throw new Error(`Skincare product ${args.id} not found`)
    }

    const updates: Partial<typeof skincare.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (args.productName) updates.productName = args.productName
    if (args.category) updates.category = args.category
    if (args.brand) updates.brand = args.brand
    if (args.status) updates.status = args.status
    if (args.routineTime) updates.routineTime = args.routineTime
    if (args.frequency) updates.frequency = args.frequency
    if (args.rating !== undefined) updates.rating = args.rating
    if (args.notes !== undefined) updates.notes = args.notes
    if (args.expiryDate !== undefined) updates.expiryDate = args.expiryDate

    const [updated] = await db
      .update(skincare)
      .set(updates)
      .where(and(eq(skincare.id, args.id), eq(skincare.workspaceId, ctx.workspaceId), eq(skincare.userId, ctx.userId)))
      .returning()

    await auditUpdate(ctx, "skincare", updated.id, existing, updated, { source: "ai_agent" })
    return { success: true, product: updated }
  },
}

export const deleteSkincareProduct: AiTool = {
  name: "delete_skincare_product",
  description: "Permanently delete a product from user's skincare shelf (requires user confirmation).",
  parameters: z.object({
    id: z.string().describe("Product ID to delete"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [existing] = await db
      .select()
      .from(skincare)
      .where(and(eq(skincare.id, args.id), eq(skincare.workspaceId, ctx.workspaceId), eq(skincare.userId, ctx.userId)))
      .limit(1)

    if (!existing) {
      throw new Error(`Skincare product ${args.id} not found`)
    }

    await db
      .delete(skincare)
      .where(and(eq(skincare.id, args.id), eq(skincare.workspaceId, ctx.workspaceId), eq(skincare.userId, ctx.userId)))

    await auditDelete(ctx, "skincare", args.id, existing, { source: "ai_agent" })
    return { success: true, message: `Deleted skincare product: ${existing.productName}` }
  },
}
