/**
 * Notes API Route
 * Handles CRUD operations for notes
 */

import { NextRequest, NextResponse } from "next/server"
import { db, notes } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"

const createNoteSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  color: z.string().optional(),
  attachments: z.array(z.string()).optional(),
})

const updateNoteSchema = createNoteSchema.partial()

/**
 * GET /api/notes - Fetch all notes
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    
    const allNotes = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.workspaceId, context.workspaceId),
          eq(notes.userId, context.userId)
        )
      )
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    
    return NextResponse.json(allNotes)
  } catch (error) {
    console.error("[Notes API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes - Create new note
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const data = createNoteSchema.parse(body)
    
    const [note] = await db
      .insert(notes)
      .values({
        ...context,
        ...data,
      })
      .returning()
    
    // Audit log
    await auditCreate(context, "note", note.id, data)
    
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error("[Notes API] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notes?id=xxx - Update note
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
    const data = updateNoteSchema.parse(body)
    
    // Get existing note
    const [existing] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, id),
          eq(notes.workspaceId, context.workspaceId),
          eq(notes.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }
    
    const [updated] = await db
      .update(notes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, id))
      .returning()
    
    // Audit log
    await auditUpdate(context, "note", id, existing, updated)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Notes API] PATCH error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notes?id=xxx - Delete note
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }
    
    // Get existing note
    const [existing] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, id),
          eq(notes.workspaceId, context.workspaceId),
          eq(notes.userId, context.userId)
        )
      )
      .limit(1)
    
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }
    
    await db
      .delete(notes)
      .where(eq(notes.id, id))
    
    // Audit log
    await auditDelete(context, "note", id, existing)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Notes API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    )
  }
}
