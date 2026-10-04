import { z } from "zod"
import { db, food } from "@/lib/db"
import { and, eq, desc, gte, lte, ilike } from "drizzle-orm"
import { auditCreate } from "@/lib/audit"
import type { AiTool } from "./types"

export const getFoodLogs: AiTool = {
  name: "get_food_logs",
  description:
    "Fetch user's food and meal logs, optionally filtered by date range (YYYY-MM-DD), meal type (breakfast/lunch/dinner/snack), food name keyword, or limit.",
  parameters: z.object({
    from: z
      .string()
      .optional()
      .describe("Start date in ISO format YYYY-MM-DD (inclusive)"),
    to: z
      .string()
      .optional()
      .describe("End date in ISO format YYYY-MM-DD (inclusive)"),
    mealType: z
      .enum(["breakfast", "lunch", "dinner", "snack"])
      .optional()
      .describe("Filter by meal type"),
    search: z
      .string()
      .optional()
      .describe("Food name or keyword to search for"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(30)
      .describe("Maximum number of meal records to return (default: 30)"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    const conditions = [
      eq(food.workspaceId, ctx.workspaceId),
      eq(food.userId, ctx.userId),
    ]

    if (args.from) {
      conditions.push(gte(food.date, args.from))
    }
    if (args.to) {
      conditions.push(lte(food.date, args.to))
    }
    if (args.mealType) {
      conditions.push(eq(food.mealType, args.mealType))
    }
    if (args.search) {
      conditions.push(ilike(food.foodName, `%${args.search}%`))
    }

    const limit = args.limit ?? 30

    const rows = await db
      .select({
        id: food.id,
        date: food.date,
        mealType: food.mealType,
        foodName: food.foodName,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        quantity: food.quantity,
        unit: food.unit,
        notes: food.notes,
      })
      .from(food)
      .where(and(...conditions))
      .orderBy(desc(food.date), desc(food.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      meals: rows,
    }
  },
}

export const logMeal: AiTool = {
  name: "log_meal",
  description: "Log a meal, food item, or snack for the user.",
  parameters: z.object({
    date: z.string().describe("Date in ISO format YYYY-MM-DD"),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Meal type"),
    foodName: z.string().describe("Food or dish name"),
    quantity: z.number().positive().optional().describe("Serving quantity"),
    unit: z.string().optional().describe("Unit of measurement (e.g. g, ml, plate, bowl, pcs)"),
    calories: z.number().positive().optional().describe("Estimated calories"),
    protein: z.number().positive().optional().describe("Protein in grams"),
    carbs: z.number().positive().optional().describe("Carbohydrates in grams"),
    fats: z.number().positive().optional().describe("Fats in grams"),
    notes: z.string().optional().describe("Additional meal notes"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    const [row] = await db
      .insert(food)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        date: args.date,
        mealType: args.mealType,
        foodName: args.foodName,
        quantity: args.quantity,
        unit: args.unit,
        calories: args.calories,
        protein: args.protein,
        carbs: args.carbs,
        fats: args.fats,
        notes: args.notes,
      })
      .returning()

    await auditCreate(ctx, "food", row.id, row, { source: "ai_agent" })
    return { success: true, meal: row }
  },
}

