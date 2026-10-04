import { z } from "zod"
import { db, savedItems } from "@/lib/db"
import { and, eq, desc, ilike, or } from "drizzle-orm"
import { auditCreate } from "@/lib/audit"
import type { AiTool } from "./types"


export const getSavedItems: AiTool = {
  name: "get_saved_items",
  description:
    "Fetch user's saved items, links, articles, videos, and bookmarks, optionally filtered by type (article/video/product/recipe/other), favorite status, search keyword, or limit.",
  parameters: z.object({
    type: z
      .enum(["article", "video", "product", "recipe", "other"])
      .optional()
      .describe("Item category type"),
    isFavorite: z
      .boolean()
      .optional()
      .describe("If true, returns only favorited items"),
    search: z
      .string()
      .optional()
      .describe("Search term for title or description"),
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
    if (args.isFavorite !== undefined) {
      conditions.push(eq(savedItems.isFavorite, args.isFavorite))
    }
    if (args.search) {
      conditions.push(
        or(
          ilike(savedItems.title, `%${args.search}%`),
          ilike(savedItems.description, `%${args.search}%`)
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
        createdAt: savedItems.createdAt,
      })
      .from(savedItems)
      .where(and(...conditions))
      .orderBy(desc(savedItems.isFavorite), desc(savedItems.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      savedItems: rows,
    }
  },
}

export const saveItem: AiTool = {
  name: "save_item",
  description: "Save a link, article, video, product, or recipe bookmark for the user.",
  parameters: z.object({
    title: z.string().describe("Title of the item to save"),
    url: z.string().optional().describe("URL or link"),
    type: z.enum(["article", "video", "product", "recipe", "other"]).default("other").describe("Type of saved item"),
    description: z.string().optional().describe("Brief description or notes"),
    tags: z.array(z.string()).optional().describe("Tags for organizing the saved item"),
    isFavorite: z.boolean().optional().describe("Mark as favorite immediately"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(savedItems)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        title: args.title,
        url: args.url,
        type: args.type ?? "other",
        description: args.description,
        tags: args.tags ?? [],
        isFavorite: args.isFavorite ?? false,
      })
      .returning()

    await auditCreate(ctx, "saved_items", row.id, row, { source: "ai_agent" })
    return { success: true, savedItem: row }
  },
}
