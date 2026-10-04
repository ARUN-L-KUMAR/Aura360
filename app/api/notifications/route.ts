import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, notifications } from "@/lib/db"
import { and, eq, desc, count } from "drizzle-orm"

// GET /api/notifications — list user notifications
export async function GET(request: NextRequest) {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 50)
    const unreadOnly = searchParams.get("unread") === "true"

    const conditions = [
      eq(notifications.workspaceId, workspaceId),
      eq(notifications.userId, userId),
    ]

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false))
    }

    const [rows, [unreadRow]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit),
      db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.workspaceId, workspaceId), eq(notifications.userId, userId), eq(notifications.isRead, false))),
    ])

    return NextResponse.json({ notifications: rows, unreadCount: unreadRow?.count ?? 0 })
  } catch (err) {
    console.error("[GET /api/notifications]", err)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// POST /api/notifications — create notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()
    const body = await request.json()

    const schema = z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      type: z.enum(["info", "warning", "error", "success"]).default("info"),
      actionUrl: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const [row] = await db
      .insert(notifications)
      .values({
        workspaceId,
        userId,
        ...parsed.data,
      })
      .returning()

    return NextResponse.json({ notification: row }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/notifications]", err)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()
    const body = await request.json()
    const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(body)

    const conditions = [
      eq(notifications.workspaceId, workspaceId),
      eq(notifications.userId, userId),
    ]

    if (ids && ids.length > 0) {
      // Mark specific notifications as read
      await Promise.all(
        ids.map((id) =>
          db
            .update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.id, id), ...conditions))
        )
      )
    } else {
      // Mark all as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(...conditions))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[PATCH /api/notifications]", err)
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }
}
