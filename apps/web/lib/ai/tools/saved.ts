import { z } from "zod"
import { db, savedItems } from "@/lib/db"
import { and, eq, desc, ilike, or, sql } from "drizzle-orm"
import { auditCreate } from "@/lib/audit"
import { productInfoOf, productStatusOf } from "@/lib/saved/product"
import type { AiTool } from "./types"


export const getSavedItems: AiTool = {
  name: "get_saved_items",
  description:
    "Fetch user's saved items, links, articles, videos, bookmarks and saved products (electronics, appliances, home decor and so on), optionally filtered by type (article/video/product/recipe/other), product status (wishlist = wants to buy, owned = already has it), favorite status, search keyword (matches title, description and category), or limit. Products come back with category, price, store and status.",
  parameters: z.object({
    type: z
      .enum(["article", "video", "product", "recipe", "other"])
      .optional()
      .describe("Item category type"),
    status: z
      .enum(["wishlist", "owned"])
      .optional()
      .describe("Only for products: wishlist = wants to buy, owned = already has it"),
    isFavorite: z
      .boolean()
      .optional()
      .describe("If true, returns only favorited items"),
    search: z
      .string()
      .optional()
      .describe("Search term for title, description or product category"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(25)
      .describe("Maximum number of items to return (default: 25)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(savedItems.workspaceId, ctx.workspaceId),
      eq(savedItems.userId, ctx.userId),
    ]

    if (args.type) {
      conditions.push(eq(savedItems.type, args.type))
    }
    if (args.status) {
      // A product with no status yet is on the wishlist.
      conditions.push(eq(savedItems.type, "product"))
      conditions.push(
        args.status === "owned"
          ? sql`${savedItems.metadata}->>'status' = 'owned'`
          : sql`coalesce(${savedItems.metadata}->>'status', 'wishlist') <> 'owned'`
      )
    }
    if (args.isFavorite !== undefined) {
      conditions.push(eq(savedItems.isFavorite, args.isFavorite))
    }
    if (args.search) {
      conditions.push(
        or(
          ilike(savedItems.title, `%${args.search}%`),
          ilike(savedItems.description, `%${args.search}%`),
          sql`${savedItems.metadata}->>'category' ilike ${`%${args.search}%`}`
        )!
      )
    }

    const limit = args.limit ?? 25

    const rows = await db
      .select({
        id: savedItems.id,
        title: savedItems.title,
        url: savedItems.url,
        type: savedItems.type,
        description: savedItems.description,
        isFavorite: savedItems.isFavorite,
        tags: savedItems.tags,
        metadata: savedItems.metadata,
        createdAt: savedItems.createdAt,
      })
      .from(savedItems)
      .where(and(...conditions))
      .orderBy(desc(savedItems.isFavorite), desc(savedItems.createdAt))
      .limit(limit)

    const items = rows.map(({ metadata, ...row }) => {
      const status = productStatusOf({ type: row.type, metadata })
      if (!status) return row
      const info = productInfoOf(metadata)
      return { ...row, status, category: info.category, price: info.price, currency: info.currency, store: info.store }
    })

    return {
      count: items.length,
      savedItems: items,
    }
  },
}

export const saveItem: AiTool = {
  name: "save_item",
  description:
    "Save a link, article, video, product, or recipe bookmark for the user. For a product without a shopping link (for example \"I want a Dyson vacuum\"), use type \"product\" and fill category, price and status. For a pasted shopping link use add_product_from_link instead.",
  parameters: z.object({
    title: z.string().describe("Title of the item to save"),
    url: z.string().optional().describe("URL or link"),
    type: z.enum(["article", "video", "product", "recipe", "other"]).default("other").describe("Type of saved item"),
    description: z.string().optional().describe("Brief description or notes"),
    tags: z.array(z.string()).optional().describe("Tags for organizing the saved item"),
    isFavorite: z.boolean().optional().describe("Mark as favorite immediately"),
    status: z
      .enum(["wishlist", "owned"])
      .optional()
      .describe("Products only: wishlist = wants to buy (default), owned = already has it"),
    category: z
      .string()
      .optional()
      .describe("Products only: Electronics, Appliances, Home & Kitchen, Furniture, Books, Beauty & Care, Health & Fitness, Toys & Baby, Grocery, Sports & Outdoors, Automotive, Stationery or Other"),
    price: z.number().positive().optional().describe("Products only: price in rupees, only if the user said it"),
    imageUrl: z.string().url().optional().describe("Picture of the item, if known"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const isProduct = args.type === "product"
    const tags = Array.from(new Set([...(args.tags ?? []), ...(isProduct && args.category ? [args.category] : [])]))

    const [row] = await db
      .insert(savedItems)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        title: args.title,
        url: args.url,
        type: args.type ?? "other",
        description: args.description,
        imageUrl: args.imageUrl,
        tags,
        isFavorite: args.isFavorite ?? false,
        ...(isProduct
          ? {
              metadata: {
                type: "product",
                status: args.status ?? "wishlist",
                ...(args.category ? { category: args.category } : {}),
                ...(args.price ? { price: args.price, currency: "INR" } : {}),
              },
            }
          : {}),
      })
      .returning()

    await auditCreate(ctx, "saved_items", row.id, row, { source: "ai_agent" })
    return { success: true, savedItem: row }
  },
}
