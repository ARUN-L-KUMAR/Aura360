/**
 * Food API Route
 * Handles CRUD operations for food/meal tracking
 */

import { NextRequest, NextResponse } from "next/server"
import { db, food } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"

const createFoodSchema = z.object({
  date: z.string(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodName: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fats: z.number().optional(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const updateFoodSchema = createFoodSchema.partial()

/**
 * GET /api/food - Fetch all food entries
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const meals = await db
      .select()
      .from(food)
      .where(
        and(
          eq(food.workspaceId, context.workspaceId),
          eq(food.userId, context.userId)
        )
      )
      .orderBy(desc(food.date), desc(food.createdAt))
    
    return NextResponse.json(meals)
  } catch (error) {
    console.error("[Food API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch meals" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/food - Create new food entry
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = createFoodSchema.parse(body)
    
    const [meal] = await db
      .insert(food)
      .values({
        ...context,
        ...data,
        quantity: data.quantity?.toString(),
        protein: data.protein?.toString(),
        carbs: data.carbs?.toString(),
        fats: data.fats?.toString(),
        fiber: data.fiber?.toString(),
        sugar: data.sugar?.toString(),
      })
      .returning()
    
    // Audit log
    await auditCreate(context, "food", meal.id, data)
    
    return NextResponse.json(meal, { status: 201 })
  } catch (error) {
    console.error("[Food API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create meal" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/food?id=xxx - Update food entry
 */
export async function PATCH(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    const body = await request.json()
    const data = updateFoodSchema.parse(body)
    
    // Get existing meal
    const [existing] = await db
      .select()
      .from(food)
      .where(
        and(
          eq(food.id, id),
          eq(food.workspaceId, context.workspaceId),
          eq(food.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 })
    }
    
    const [updated] = await db
      .update(food)
      .set({
        ...data,
        quantity: data.quantity?.toString(),
        protein: data.protein?.toString(),
        carbs: data.carbs?.toString(),
        fats: data.fats?.toString(),
        fiber: data.fiber?.toString(),
        sugar: data.sugar?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(food.id, id))
      .returning()
    
    // Audit log
    await auditUpdate(context, "food", id, existing, updated)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Food API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update meal" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/food?id=xxx - Delete food entry
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    // Get existing meal
    const [existing] = await db
      .select()
      .from(food)
      .where(
        and(
          eq(food.id, id),
          eq(food.workspaceId, context.workspaceId),
          eq(food.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 })
    }
    
    await db
      .delete(food)
      .where(eq(food.id, id))
    
    // Audit log
    await auditDelete(context, "food", id, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Food API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete meal" },
      { status: 500 }
    )
  }
}
