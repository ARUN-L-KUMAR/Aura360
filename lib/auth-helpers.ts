/**
 * Server-side session and context helpers
 */

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { type WorkspaceContext } from "@/lib/db"

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
