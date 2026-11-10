import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { users, workspaces, workspaceMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getWorkspaceContext, requireWorkspaceAdmin } from "@/lib/auth-helpers"

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
})

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["admin", "member", "viewer"]),
})

// GET /api/workspaces/members - List members of current workspace
export async function GET() {
  try {
    const context = await getWorkspaceContext()

    // Get workspace details to know the owner
    const [workspace] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
      })
      .from(workspaces)
      .where(eq(workspaces.id, context.workspaceId))
      .limit(1)

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Fetch members with user profiles
    const members = await db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        invitedAt: workspaceMembers.invitedAt,
        joinedAt: workspaceMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, context.workspaceId))

    // Determine current user's role
    const isOwner = workspace.ownerId === context.userId
    const currentMember = members.find((m) => m.userId === context.userId)
    const currentUserRole = isOwner ? "owner" : (currentMember?.role || "viewer")

    return NextResponse.json({
      members,
      workspaceOwnerId: workspace.ownerId,
      currentUserRole,
      canManage: isOwner || currentUserRole === "admin",
    })
  } catch (error: any) {
    console.error("[GET /api/workspaces/members error]:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to fetch workspace members" },
      { status: 500 }
    )
  }
}

// POST /api/workspaces/members - Invite a member to active workspace
export async function POST(request: NextRequest) {
  try {
    const context = await requireWorkspaceAdmin()

    const body = await request.json()
    const parsed = inviteMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid invitation data", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { email, role } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Check if target user exists in Aura360
    const [targetUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email was not found. They must first create an account on Aura360." },
        { status: 404 }
      )
    }

    // Check if already a member of this workspace
    const [existingMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, context.workspaceId),
          eq(workspaceMembers.userId, targetUser.id)
        )
      )
      .limit(1)

    if (existingMember) {
      return NextResponse.json(
        { error: "This user is already a member of this workspace." },
        { status: 409 }
      )
    }

    // Add user as workspace member
    const [newMember] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId: context.workspaceId,
        userId: targetUser.id,
        role,
        joinedAt: new Date(),
      })
      .returning()

    return NextResponse.json({
      success: true,
      message: `Added ${targetUser.name || targetUser.email} to workspace as ${role}`,
      member: {
        ...newMember,
        userName: targetUser.name,
        userEmail: targetUser.email,
      },
    })
  } catch (error: any) {
    console.error("[POST /api/workspaces/members error]:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to invite member" },
      { status: error?.message?.includes("Forbidden") ? 403 : 500 }
    )
  }
}

// PATCH /api/workspaces/members - Update member role
export async function PATCH(request: NextRequest) {
  try {
    const context = await requireWorkspaceAdmin()

    const body = await request.json()
    const parsed = updateMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid role update data", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { memberId, role } = parsed.data

    // Check workspace owner to prevent demoting owner
    const [workspace] = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, context.workspaceId))
      .limit(1)

    const [targetMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, context.workspaceId)
        )
      )
      .limit(1)

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (workspace && targetMember.userId === workspace.ownerId) {
      return NextResponse.json(
        { error: "The primary workspace owner's role cannot be modified." },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(workspaceMembers)
      .set({ role })
      .where(eq(workspaceMembers.id, memberId))
      .returning()

    return NextResponse.json({
      success: true,
      member: updated,
    })
  } catch (error: any) {
    console.error("[PATCH /api/workspaces/members error]:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to update member role" },
      { status: error?.message?.includes("Forbidden") ? 403 : 500 }
    )
  }
}

// DELETE /api/workspaces/members - Remove member from workspace
export async function DELETE(request: NextRequest) {
  try {
    const context = await requireWorkspaceAdmin()
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json({ error: "memberId parameter is required" }, { status: 400 })
    }

    // Check if target member belongs to this workspace
    const [targetMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, context.workspaceId)
        )
      )
      .limit(1)

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Check if user is workspace owner
    const [workspace] = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, context.workspaceId))
      .limit(1)

    if (workspace && targetMember.userId === workspace.ownerId) {
      return NextResponse.json(
        { error: "The workspace owner cannot be removed." },
        { status: 400 }
      )
    }

    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.id, memberId))

    return NextResponse.json({
      success: true,
      message: "Member removed from workspace",
    })
  } catch (error: any) {
    console.error("[DELETE /api/workspaces/members error]:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to remove member" },
      { status: error?.message?.includes("Forbidden") ? 403 : 500 }
    )
  }
}

