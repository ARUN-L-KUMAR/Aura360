import { z } from "zod"
import { db, notes } from "@/lib/db"
import { and, eq, desc, ilike, or } from "drizzle-orm"
import { auditCreate, auditUpdate } from "@/lib/audit"
import type { AiTool } from "./types"

export const getNotes: AiTool = {
  name: "get_notes",
  description:
    "Fetch user's notes and journals, optionally filtered by category, search keyword in title/content, pinned status, or limit.",
  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe("Filter by note category (e.g. Work, Personal, Ideas)"),
    search: z
      .string()
      .optional()
      .describe("Search term matching against title or note content"),
    isPinned: z
      .boolean()
      .optional()
      .describe("If true, returns only pinned notes"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(20)
      .describe("Maximum number of notes to return (default: 20)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(notes.workspaceId, ctx.workspaceId),
      eq(notes.userId, ctx.userId),
      eq(notes.isArchived, false),
    ]

    if (args.category) {
      conditions.push(eq(notes.category, args.category))
    }
    if (args.isPinned !== undefined) {
      conditions.push(eq(notes.isPinned, args.isPinned))
    }
    if (args.search) {
      conditions.push(
        or(
          ilike(notes.title, `%${args.search}%`),
          ilike(notes.content, `%${args.search}%`)
        )!
      )
    }

    const limit = args.limit ?? 20

    const rows = await db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        category: notes.category,
        tags: notes.tags,
        isPinned: notes.isPinned,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
      .limit(limit)

    return {
      count: rows.length,
      notes: rows,
    }
  },
}

export const createNote: AiTool = {
  name: "create_note",
  description: "Create a new note or journal entry for the user.",
  parameters: z.object({
    title: z.string().describe("Note title"),
    content: z.string().optional().describe("Note content or body text"),
    category: z.string().optional().describe("Category (e.g. Work, Personal, Ideas)"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
    isPinned: z.boolean().optional().describe("Whether to pin this note to top"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(notes)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        title: args.title,
        content: args.content ?? "",
        category: args.category ?? "General",
        tags: args.tags ?? [],
        isPinned: args.isPinned ?? false,
      })
      .returning()

    await auditCreate(ctx, "notes", row.id, row, { source: "ai_agent" })
    return { success: true, note: row }
  },
}

export const updateNote: AiTool = {
  name: "update_note",
  description: "Update an existing note's title, content, category, or pinned status.",
  parameters: z.object({
    id: z.string().describe("UUID of the note to update"),
    title: z.string().optional().describe("New title"),
    content: z.string().optional().describe("New body content"),
    category: z.string().optional().describe("New category"),
    isPinned: z.boolean().optional().describe("Updated pin status"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, args.id), eq(notes.workspaceId, ctx.workspaceId), eq(notes.userId, ctx.userId)))

    if (!existing) {
      throw new Error(`Note ${args.id} not found`)
    }

    const updates: Partial<typeof notes.$inferInsert> = {}
    if (args.title) updates.title = args.title
    if (args.content !== undefined) updates.content = args.content
    if (args.category) updates.category = args.category
    if (args.isPinned !== undefined) updates.isPinned = args.isPinned
    updates.updatedAt = new Date()

    const [row] = await db
      .update(notes)
      .set(updates)
      .where(and(eq(notes.id, args.id), eq(notes.workspaceId, ctx.workspaceId), eq(notes.userId, ctx.userId)))
      .returning()

    await auditUpdate(ctx, "notes", row.id, existing, row, { source: "ai_agent" })
    return { success: true, note: row }
  },
}

