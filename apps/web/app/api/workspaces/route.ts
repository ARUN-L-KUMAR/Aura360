import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db, workspaces, workspaceMembers } from "@/lib/db"
import { eq } from "drizzle-orm"

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  timezone: z.string().default("UTC"),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Workspaces owned by user
    const owned = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, userId))

    // Workspaces where user is a member
    const memberRows = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))

    return NextResponse.json({
      owned,
      memberships: memberRows,
    })
  } catch (error: any) {
    console.error("[GET /api/workspaces error]:", error)
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const parsed = createWorkspaceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid workspace configuration", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { name, currency, timezone } = parsed.data
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name,
        slug,
        ownerId: userId,
        settings: {
          currency,
          timezone,
          dateFormat: currency === "INR" ? "DD/MM/YYYY" : "MM/DD/YYYY",
        },
      })
      .returning()

    // Add owner to workspace_members table
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    })

    return NextResponse.json({
      success: true,
      workspace,
    })
  } catch (error: any) {
    console.error("[POST /api/workspaces error]:", error)
    return NextResponse.json({ error: error?.message || "Failed to create workspace" }, { status: 500 })
  }
}

