/**
 * Time Logs API Route
 * Handles CRUD operations for time tracking
 */

import { NextRequest, NextResponse } from "next/server"
import { db, timeLogs } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"

const createTimeLogSchema = z.object({
  date: z.string(),
  activity: z.string(),
  category: z.string().optional(),
  duration: z.number(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  productivityScore: z.number().min(1).max(10).optional(),
})

const updateTimeLogSchema = createTimeLogSchema.partial()

/**
 * GET /api/time - Fetch all time logs
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const logs = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.workspaceId, context.workspaceId),
          eq(timeLogs.userId, context.userId)
        )
      )
      .orderBy(desc(timeLogs.date), desc(timeLogs.createdAt))
    
    return NextResponse.json(logs)
  } catch (error) {
    console.error("[Time API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch time logs" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/time - Create new time log
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = createTimeLogSchema.parse(body)
    
    const [log] = await db
      .insert(timeLogs)
      .values({
        ...context,
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      })
      .returning()
    
    // Audit log
    await auditCreate(context, "time_log", log.id, data)
    
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error("[Time API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create time log" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/time?id=xxx - Update time log
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
    const data = updateTimeLogSchema.parse(body)
    
    // Get existing log
    const [existing] = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.id, id),
          eq(timeLogs.workspaceId, context.workspaceId),
          eq(timeLogs.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Time log not found" }, { status: 404 })
    }
    
    const [updated] = await db
      .update(timeLogs)
      .set({
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(timeLogs.id, id))
      .returning()
    
    // Audit log
    await auditUpdate(context, "time_log", id, existing, updated)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Time API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update time log" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/time?id=xxx - Delete time log
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    // Get existing log
    const [existing] = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.id, id),
          eq(timeLogs.workspaceId, context.workspaceId),
          eq(timeLogs.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Time log not found" }, { status: 404 })
    }
    
    await db
      .delete(timeLogs)
      .where(eq(timeLogs.id, id))
    
    // Audit log
    await auditDelete(context, "time_log", id, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Time API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete time log" },
      { status: 500 }
    )
  }
}
