import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { workspaces, workspaceMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const parsed = switchWorkspaceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid workspace ID", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { workspaceId } = parsed.data

    // Check if user is owner of the workspace
    const [owned] = await db
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
      .limit(1)

    if (!owned) {
      // Check if user is a member of the workspace
      const [membership] = await db
        .select({
          workspaceId: workspaceMembers.workspaceId,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        )
        .limit(1)

      if (!membership) {
        return NextResponse.json(
          { error: "You do not have access to this workspace." },
          { status: 403 }
        )
      }
    }

    // Return success. Client will call session.update({ workspaceId })
    return NextResponse.json({
      success: true,
      workspaceId,
    })
  } catch (error: any) {
    console.error("[POST /api/workspaces/switch error]:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to switch workspace" },
      { status: 500 }
    )
  }
}

