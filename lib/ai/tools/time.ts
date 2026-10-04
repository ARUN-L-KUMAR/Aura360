import { z } from "zod"
import { db, timeLogs } from "@/lib/db"
import { and, eq, desc, gte, lte, ilike, or } from "drizzle-orm"
import { auditCreate } from "@/lib/audit"
import type { AiTool } from "./types"

export const getTimeLogs: AiTool = {
  name: "get_time_logs",
  description:
    "Fetch user's time tracking logs and activities, optionally filtered by date range (YYYY-MM-DD), activity name, category, or limit.",
  parameters: z.object({
    from: z
      .string()
      .optional()
      .describe("Start date in ISO format YYYY-MM-DD (inclusive)"),
    to: z
      .string()
      .optional()
      .describe("End date in ISO format YYYY-MM-DD (inclusive)"),
    activity: z
      .string()
      .optional()
      .describe("Activity or task name search keyword"),
    category: z
      .string()
      .optional()
      .describe("Category name (e.g. Deep Work, Learning, Meetings)"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(30)
      .describe("Maximum number of time logs to return (default: 30)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(timeLogs.workspaceId, ctx.workspaceId),
      eq(timeLogs.userId, ctx.userId),
    ]

    if (args.from) {
      conditions.push(gte(timeLogs.date, args.from))
    }
    if (args.to) {
      conditions.push(lte(timeLogs.date, args.to))
    }
    if (args.category) {
      conditions.push(eq(timeLogs.category, args.category))
    }
    if (args.activity) {
      conditions.push(
        or(
          ilike(timeLogs.activity, `%${args.activity}%`),
          ilike(timeLogs.description, `%${args.activity}%`)
        )!
      )
    }

    const limit = args.limit ?? 30

    const rows = await db
      .select({
        id: timeLogs.id,
        date: timeLogs.date,
        activity: timeLogs.activity,
        category: timeLogs.category,
        duration: timeLogs.duration,
        startTime: timeLogs.startTime,
        endTime: timeLogs.endTime,
        description: timeLogs.description,
        productivityScore: timeLogs.productivityScore,
      })
      .from(timeLogs)
      .where(and(...conditions))
      .orderBy(desc(timeLogs.date), desc(timeLogs.createdAt))
      .limit(limit)

    const totalMinutes = rows.reduce((sum, r) => sum + (r.duration || 0), 0)

    return {
      count: rows.length,
      totalDurationMinutes: totalMinutes,
      timeLogs: rows,
    }
  },
}

export const logTimeEntry: AiTool = {
  name: "log_time_entry",
  description: "Log a time tracking entry or activity for the user.",
  parameters: z.object({
    date: z.string().describe("Date in YYYY-MM-DD format"),
    activity: z.string().describe("Name of activity or task"),
    duration: z.number().positive().describe("Duration in minutes"),
    category: z.string().optional().describe("Category (e.g. Deep Work, Meetings, Learning)"),
    description: z.string().optional().describe("Additional notes or description"),
    productivityScore: z.number().min(1).max(10).optional().describe("Productivity rating 1-10"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(timeLogs)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        date: args.date,
        activity: args.activity,
        duration: args.duration,
        category: args.category ?? "General",
        description: args.description,
        productivityScore: args.productivityScore,
      })
      .returning()

    await auditCreate(ctx, "time_logs", row.id, row, { source: "ai_agent" })
    return { success: true, timeLog: row }
  },
}

