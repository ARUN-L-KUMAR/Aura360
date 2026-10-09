/**
 * Fitness API Route
 * Handles CRUD operations for fitness tracking
 */

import { NextRequest, NextResponse } from "next/server"
import { db, fitness } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import { eq, and, desc, gte, lte } from "drizzle-orm"
import { z } from "zod"

const exerciseSchema = z.object({
  name: z.string(),
  sets: z.number().optional(),
  reps: z.number().optional(),
  weight: z.number().optional(),
})

const createFitnessSchema = z.object({
  date: z.string(),
  type: z.string(),
  workoutType: z.string().optional(),
  duration: z.number().optional(),
  caloriesBurned: z.number().optional(),
  distance: z.number().optional(),
  intensity: z.string().optional(),
  measurementType: z.string().optional(),
  measurementValue: z.number().optional(),
  measurementUnit: z.string().optional(),
  exercises: z.array(exerciseSchema).optional(),
  notes: z.string().optional(),
  mood: z.string().optional(),
  // Free-form extras, e.g. { name: "Chest & Triceps" } from the mobile app. The web ignores it.
  metadata: z.record(z.any()).optional(),
})

const updateFitnessSchema = createFitnessSchema.partial()

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * GET /api/fitness - Fetch fitness entries.
 * Optional `from` / `to` (YYYY-MM-DD, inclusive) limit the range; without them every entry is returned.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if ((from && !DAY_PATTERN.test(from)) || (to && !DAY_PATTERN.test(to))) {
      return NextResponse.json({ error: "from / to must be YYYY-MM-DD" }, { status: 400 })
    }

    const entries = await db
      .select()
      .from(fitness)
      .where(
        and(
          eq(fitness.workspaceId, context.workspaceId),
          eq(fitness.userId, context.userId),
          from ? gte(fitness.date, from) : undefined,
          to ? lte(fitness.date, to) : undefined
        )
      )
      .orderBy(desc(fitness.date), desc(fitness.createdAt))
    
    return NextResponse.json(entries)
  } catch (error) {
    console.error("[Fitness API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch fitness entries" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/fitness - Create new fitness entry
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = createFitnessSchema.parse(body)
    
    const [entry] = await db
      .insert(fitness)
      .values({
        ...context,
        ...data,
        distance: data.distance?.toString(),
        measurementValue: data.measurementValue?.toString(),
      })
      .returning()
    
    // Audit log
    await auditCreate(context, "fitness", entry.id, data)
    
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("[Fitness API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create fitness entry" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/fitness?id=xxx - Update fitness entry
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
    const data = updateFitnessSchema.parse(body)
    
    // Get existing entry
    const [existing] = await db
      .select()
      .from(fitness)
      .where(
        and(
          eq(fitness.id, id),
          eq(fitness.workspaceId, context.workspaceId),
          eq(fitness.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Fitness entry not found" }, { status: 404 })
    }
    
    const [updated] = await db
      .update(fitness)
      .set({
        ...data,
        distance: data.distance?.toString(),
        measurementValue: data.measurementValue?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(fitness.id, id))
      .returning()
    
    // Audit log
    await auditUpdate(context, "fitness", id, existing, updated)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Fitness API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update fitness entry" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/fitness?id=xxx - Delete fitness entry
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    // Get existing entry
    const [existing] = await db
      .select()
      .from(fitness)
      .where(
        and(
          eq(fitness.id, id),
          eq(fitness.workspaceId, context.workspaceId),
          eq(fitness.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Fitness entry not found" }, { status: 404 })
    }
    
    await db
      .delete(fitness)
      .where(eq(fitness.id, id))
    
    // Audit log
    await auditDelete(context, "fitness", id, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Fitness API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete fitness entry" },
      { status: 500 }
    )
  }
}
