/**
 * Server-side session and context helpers
 */

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db, workspaces, workspaceMembers, type WorkspaceContext } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { getBearerToken, verifyAccessToken, type MobileTokenClaims } from "@/lib/mobile-token"

/**
 * Claims from a valid `Authorization: Bearer` access token (the mobile app), or null.
 * Web requests carry a session cookie instead and never reach this branch.
 */
export async function getMobileClaims(): Promise<MobileTokenClaims | null> {
  const token = getBearerToken(await headers())
  return token ? verifyAccessToken(token) : null
}

/**
 * Session for API routes that must work for both web (cookie) and mobile (bearer token).
 * Returns null instead of redirecting.
 */
export async function getApiSession() {
  const claims = await getMobileClaims()
  if (claims) {
    return {
      user: {
        id: claims.userId,
        workspaceId: claims.workspaceId,
        name: claims.name ?? null,
        image: claims.picture ?? null,
      },
    }
  }
  const session = await auth()
  return session?.user ? session : null
}

/**
 * Get authenticated session or redirect to login
 */
export async function getAuthSession() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/login")
  }

  return session
}

/**
 * Get workspace context for database queries
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const claims = await getMobileClaims()
  if (claims) {
    return { workspaceId: claims.workspaceId, userId: claims.userId }
  }

  const session = await getAuthSession()

  if (!session.user.workspaceId) {
    // Check if user has an owned workspace in the database
    const [owned] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.ownerId, session.user.id))
      .limit(1)

    if (owned) {
      session.user.workspaceId = owned.id
      return {
        workspaceId: owned.id,
        userId: session.user.id,
      }
    }

    // Check if user is a member of any workspace
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, session.user.id))
      .limit(1)

    if (membership) {
      session.user.workspaceId = membership.workspaceId
      return {
        workspaceId: membership.workspaceId,
        userId: session.user.id,
      }
    }

    // If still no workspace, redirect to setup
    redirect("/onboarding/workspace")
  }

  return {
    workspaceId: session.user.workspaceId,
    userId: session.user.id,
  }
}

/**
 * Get optional auth session (doesn't redirect)
 */
export async function getOptionalSession() {
  return await auth()
}

/**
 * Check if user is workspace owner/admin
 */
export async function requireWorkspaceAdmin() {
  const context = await getWorkspaceContext()
  
  // Check if owner of workspace
  const [workspace] = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, context.workspaceId))
    .limit(1)

  if (workspace && workspace.ownerId === context.userId) {
    return context
  }

  // Check role from workspace_members table
  const [membership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, context.workspaceId),
        eq(workspaceMembers.userId, context.userId)
      )
    )
    .limit(1)

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Forbidden: Admin or Owner privileges required")
  }
  // For now, just return context
  return context
}
