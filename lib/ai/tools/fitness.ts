import { z } from "zod"
import { db, fitness } from "@/lib/db"
import { and, eq, desc, gte, lte, ilike, or } from "drizzle-orm"
import { auditCreate } from "@/lib/audit"
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

