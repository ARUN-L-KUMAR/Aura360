import { z } from "zod"
import { db, fashionItems } from "@/lib/db"
import { and, eq, desc, ilike, or } from "drizzle-orm"
import { auditCreate } from "@/lib/audit"
import type { AiTool } from "./types"
import { loadFashionProfile } from "@/lib/fashion/profile-server"
import { describeFashionProfile } from "@/lib/fashion/profile"

function stemWord(word: string): string {
  const w = word.trim()
  if (w.toLowerCase().endsWith("ies") && w.length > 4) {
    return w.slice(0, -3) + "y"
  }
  if (w.toLowerCase().endsWith("es") && w.length > 3) {
    return w.slice(0, -2)
  }
  if (w.toLowerCase().endsWith("s") && w.length > 2) {
    return w.slice(0, -1)
  }
  return w
}

export const getWardrobe: AiTool = {
  name: "get_wardrobe",
  description:
    "Fetch user's wardrobe clothing and accessory items, optionally filtered by category (e.g. Tops, Bottoms, Footwear, Watch, Accessories), color, brand, or favorite status.",
  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe("Filter by category (e.g. Tops, Bottoms, Outerwear, Footwear, Watch, Accessories)"),
    brand: z
      .string()
      .optional()
      .describe("Filter by brand name"),
    color: z
      .string()
      .optional()
      .describe("Filter by color (e.g. Black, Blue, White)"),
    isFavorite: z
      .boolean()
      .optional()
      .describe("If true, returns only favorite items"),
    search: z
      .string()
      .optional()
      .describe("Keyword to match against item name or description"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(40)
      .describe("Maximum number of items to return (default: 40)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(fashionItems.workspaceId, ctx.workspaceId),
      eq(fashionItems.userId, ctx.userId),
      eq(fashionItems.status, "wardrobe"),
    ]

    if (args.category) {
      const stem = stemWord(args.category)
      conditions.push(
        or(
          ilike(fashionItems.category, `%${args.category}%`),
          ilike(fashionItems.category, `%${stem}%`),
          ilike(fashionItems.subcategory, `%${args.category}%`),
          ilike(fashionItems.subcategory, `%${stem}%`),
          ilike(fashionItems.name, `%${args.category}%`),
          ilike(fashionItems.name, `%${stem}%`)
        )!
      )
    }
    if (args.brand) {
      conditions.push(ilike(fashionItems.brand, `%${args.brand}%`))
    }
    if (args.color) {
      conditions.push(ilike(fashionItems.color, `%${args.color}%`))
    }
    if (args.isFavorite !== undefined) {
      conditions.push(eq(fashionItems.isFavorite, args.isFavorite))
    }
    if (args.search) {
      const stem = stemWord(args.search)
      conditions.push(
        or(
          ilike(fashionItems.name, `%${args.search}%`),
          ilike(fashionItems.name, `%${stem}%`),
          ilike(fashionItems.description, `%${args.search}%`),
          ilike(fashionItems.category, `%${args.search}%`),
          ilike(fashionItems.subcategory, `%${args.search}%`)
        )!
      )
    }

    const limit = args.limit ?? 40

    const rows = await db
      .select({
        id: fashionItems.id,
        name: fashionItems.name,
        category: fashionItems.category,
        subcategory: fashionItems.subcategory,
        brand: fashionItems.brand,
        color: fashionItems.color,
        size: fashionItems.size,
        price: fashionItems.price,
        isFavorite: fashionItems.isFavorite,
        wearCount: fashionItems.wearCount,
        lastWornDate: fashionItems.lastWornDate,
        notes: fashionItems.notes,
      })
      .from(fashionItems)
      .where(and(...conditions))
      .orderBy(desc(fashionItems.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      wardrobeItems: rows,
    }
  },
}

export const getWishlist: AiTool = {
  name: "get_wishlist",
  description:
    "Fetch user's fashion wishlist items to buy, optionally filtered by category, brand, or search keyword.",
  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe("Filter by category name"),
    brand: z
      .string()
      .optional()
      .describe("Filter by brand"),
    search: z
      .string()
      .optional()
      .describe("Search term for item name or description"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(40)
      .describe("Maximum number of items to return (default: 40)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(fashionItems.workspaceId, ctx.workspaceId),
      eq(fashionItems.userId, ctx.userId),
      eq(fashionItems.status, "wishlist"),
    ]

    if (args.category) {
      const stem = stemWord(args.category)
      conditions.push(
        or(
          ilike(fashionItems.category, `%${args.category}%`),
          ilike(fashionItems.category, `%${stem}%`),
          ilike(fashionItems.subcategory, `%${args.category}%`),
          ilike(fashionItems.subcategory, `%${stem}%`),
          ilike(fashionItems.name, `%${args.category}%`),
          ilike(fashionItems.name, `%${stem}%`)
        )!
      )
    }
    if (args.brand) {
      conditions.push(ilike(fashionItems.brand, `%${args.brand}%`))
    }
    if (args.search) {
      const stem = stemWord(args.search)
      conditions.push(
        or(
          ilike(fashionItems.name, `%${args.search}%`),
          ilike(fashionItems.name, `%${stem}%`),
          ilike(fashionItems.description, `%${args.search}%`),
          ilike(fashionItems.category, `%${args.search}%`),
          ilike(fashionItems.subcategory, `%${args.search}%`)
        )!
      )
    }

    const limit = args.limit ?? 40

    const rows = await db
      .select({
        id: fashionItems.id,
        name: fashionItems.name,
        category: fashionItems.category,
        brand: fashionItems.brand,
        color: fashionItems.color,
        price: fashionItems.price,
        notes: fashionItems.notes,
        metadata: fashionItems.metadata,
      })
      .from(fashionItems)
      .where(and(...conditions))
      .orderBy(desc(fashionItems.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      wishlistItems: rows,
    }
  },
}

export const addFashionItem: AiTool = {
  name: "add_fashion_item",
  description: "Add a fashion item to user's wardrobe (owned) or wishlist (to buy).",
  parameters: z.object({
    name: z.string().describe("Item name"),
    status: z.enum(["wardrobe", "wishlist"]).default("wardrobe").describe("Status: wardrobe (owned) or wishlist (to buy)"),
    category: z.string().describe("Category (e.g. Tops, Bottoms, Outerwear, Footwear, Accessories)"),
    subcategory: z.string().optional().describe("Subcategory (e.g. T-Shirt, Jeans, Sneakers)"),
    brand: z.string().optional().describe("Brand name"),
    color: z.string().optional().describe("Color"),
    size: z.string().optional().describe("Size"),
    price: z.number().positive().optional().describe("Price or cost in ₹"),
    notes: z.string().optional().describe("Notes"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(fashionItems)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        name: args.name,
        status: args.status,
        category: args.category,
        subcategory: args.subcategory,
        brand: args.brand,
        color: args.color,
        size: args.size,
        price: args.price !== undefined ? String(args.price) : undefined,
        notes: args.notes,
      })
      .returning()

    await auditCreate(ctx, "fashion_items", row.id, row, { source: "ai_agent" })
    return { success: true, item: row }
  },
}


export const getFashionProfile: AiTool = {
  name: "get_fashion_profile",
  description:
    "Fetch the user's saved fit profile: body measurements, usual sizes (tops, bottoms, shoes), skin tone and undertone, hair/eye color, preferred fit, style tags, favorite colors and colors they avoid. Call this before recommending outfits, colors, sizes or fit, and when asked about their measurements or size.",
  parameters: z.object({}),
  mutates: false,
  handler: async (_args, ctx) => {
    const profile = await loadFashionProfile(ctx)
    const summary = describeFashionProfile(profile)
    if (!summary) {
      return {
        hasProfile: false,
        message: "The user hasn't filled in their fit profile yet. They can add it in Fashion > My Fit.",
      }
    }
    return { hasProfile: true, summary, profile }
  },
}
