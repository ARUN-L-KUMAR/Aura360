/**
 * Server-side session and context helpers
 */

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { type WorkspaceContext } from "@/lib/db"
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
    // If no workspace, redirect to setup
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
  
  // TODO: Add role check from workspace_members table
  // For now, just return context
  return context
}
