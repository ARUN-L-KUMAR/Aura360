import { z } from "zod"
import { db, fitness } from "@/lib/db"
import { and, eq, desc, gte, lte, ilike, or } from "drizzle-orm"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import type { AiTool } from "./types"

export const getFitnessLogs: AiTool = {
  name: "get_fitness_logs",
  description:
    "Fetch user's workout and exercise logs, optionally filtered by date range (YYYY-MM-DD), workout type, activity name, or limit.",
  parameters: z.object({
    from: z
      .string()
      .optional()
      .describe("Start date in ISO format YYYY-MM-DD (inclusive)"),
    to: z
      .string()
      .optional()
      .describe("End date in ISO format YYYY-MM-DD (inclusive)"),
    workoutType: z
      .string()
      .optional()
      .describe("Specific workout category or name (e.g. Running, Strength, Yoga, Cardio)"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(30)
      .describe("Maximum number of workout records to return (default: 30)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(fitness.workspaceId, ctx.workspaceId),
      eq(fitness.userId, ctx.userId),
    ]

    if (args.from) {
      conditions.push(gte(fitness.date, args.from))
    }
    if (args.to) {
      conditions.push(lte(fitness.date, args.to))
    }
    if (args.workoutType) {
      conditions.push(
        or(
          ilike(fitness.workoutType, `%${args.workoutType}%`),
          ilike(fitness.type, `%${args.workoutType}%`)
        )!
      )
    }

    const limit = args.limit ?? 30

    const rows = await db
      .select({
        id: fitness.id,
        date: fitness.date,
        type: fitness.type,
        workoutType: fitness.workoutType,
        duration: fitness.duration,
        caloriesBurned: fitness.caloriesBurned,
        distance: fitness.distance,
        intensity: fitness.intensity,
        notes: fitness.notes,
      })
      .from(fitness)
      .where(and(...conditions))
      .orderBy(desc(fitness.date), desc(fitness.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      fitnessLogs: rows,
    }
  },
}

export const logWorkout: AiTool = {
  name: "log_workout",
  description: "Log a workout, exercise session, or physical activity for the user.",
  parameters: z.object({
    date: z.string().describe("Workout date in ISO format YYYY-MM-DD"),
    type: z.string().describe("Activity type (e.g. cardio, strength, flexibility, sports)"),
    workoutType: z.string().optional().describe("Specific workout name (e.g. Upper Body, 5k Run, HIIT, Yoga)"),
    duration: z.number().positive().optional().describe("Duration in minutes"),
    caloriesBurned: z.number().positive().optional().describe("Estimated calories burned"),
    distance: z.number().positive().optional().describe("Distance in kilometers (if applicable)"),
    intensity: z.enum(["low", "medium", "high"]).optional().describe("Workout intensity"),
    notes: z.string().optional().describe("Additional notes or impressions"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(fitness)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        date: args.date,
        type: args.type,
        workoutType: args.workoutType ?? args.type,
        duration: args.duration,
        caloriesBurned: args.caloriesBurned,
        distance: args.distance,
        intensity: args.intensity ?? "medium",
        notes: args.notes,
      })
      .returning()

    await auditCreate(ctx, "fitness", row.id, row, { source: "ai_agent" })
    return { success: true, workout: row }
  },
}

export const updateWorkout: AiTool = {
  name: "update_workout",
  description: "Update an existing logged workout's duration, calories, intensity, workout type, or notes.",
  parameters: z.object({
    id: z.string().describe("Workout log ID to update"),
    workoutType: z.string().optional().describe("Workout title/type"),
    type: z.string().optional().describe("Activity category (e.g. cardio, strength)"),
    duration: z.number().positive().optional().describe("Duration in minutes"),
    caloriesBurned: z.number().positive().optional().describe("Calories burned"),
    distance: z.number().positive().optional().describe("Distance in km"),
    intensity: z.enum(["low", "medium", "high"]).optional().describe("Intensity"),
    notes: z.string().optional().describe("Workout notes"),
    date: z.string().optional().describe("Date in YYYY-MM-DD"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [existing] = await db
      .select()
      .from(fitness)
      .where(and(eq(fitness.id, args.id), eq(fitness.workspaceId, ctx.workspaceId), eq(fitness.userId, ctx.userId)))
      .limit(1)

    if (!existing) {
      throw new Error(`Workout log ${args.id} not found`)
    }

    const updates: Partial<typeof fitness.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (args.workoutType) updates.workoutType = args.workoutType
    if (args.type) updates.type = args.type
    if (args.duration !== undefined) updates.duration = args.duration
    if (args.caloriesBurned !== undefined) updates.caloriesBurned = args.caloriesBurned
    if (args.distance !== undefined) updates.distance = args.distance
    if (args.intensity) updates.intensity = args.intensity
    if (args.notes !== undefined) updates.notes = args.notes
    if (args.date) updates.date = args.date

    const [updated] = await db
      .update(fitness)
      .set(updates)
      .where(and(eq(fitness.id, args.id), eq(fitness.workspaceId, ctx.workspaceId), eq(fitness.userId, ctx.userId)))
      .returning()

    await auditUpdate(ctx, "fitness", updated.id, existing, updated, { source: "ai_agent" })
    return { success: true, workout: updated }
  },
}

export const deleteWorkout: AiTool = {
  name: "delete_workout",
  description: "Permanently delete a logged workout by ID (requires user confirmation).",
  parameters: z.object({
    id: z.string().describe("Workout log ID to delete"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [existing] = await db
      .select()
      .from(fitness)
      .where(and(eq(fitness.id, args.id), eq(fitness.workspaceId, ctx.workspaceId), eq(fitness.userId, ctx.userId)))
      .limit(1)

    if (!existing) {
      throw new Error(`Workout log ${args.id} not found`)
    }

    await db
      .delete(fitness)
      .where(and(eq(fitness.id, args.id), eq(fitness.workspaceId, ctx.workspaceId), eq(fitness.userId, ctx.userId)))

    await auditDelete(ctx, "fitness", args.id, existing, { source: "ai_agent" })
    return { success: true, message: `Deleted workout: ${existing.workoutType || existing.type} on ${existing.date}` }
  },
}

