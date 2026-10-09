/**
 * Mobile session handling: issue / rotate / revoke refresh tokens.
 * The matching short-lived access token is created in lib/mobile-token.ts.
 */

import crypto from "crypto"
import { and, eq, isNull } from "drizzle-orm"
import { db, users, workspaces, mobileRefreshTokens } from "@/lib/db"
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from "@/lib/mobile-token"

const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000

export type MobileUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  workspaceId: string
}

export type MobileSessionPayload = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: MobileUser
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function getPrimaryWorkspaceId(userId: string): Promise<string | null> {
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
    .limit(1)
  return workspace?.id ?? null
}

/** Creates a fresh access + refresh token pair for a user. */
export async function createMobileSession(
  userId: string,
  deviceName?: string | null
): Promise<MobileSessionPayload | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return null

  const workspaceId = await getPrimaryWorkspaceId(user.id)
  if (!workspaceId) return null

  const refreshToken = crypto.randomBytes(48).toString("base64url")
  await db.insert(mobileRefreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    deviceName: deviceName?.slice(0, 100) ?? null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  })

  const accessToken = await signAccessToken({
    userId: user.id,
    workspaceId,
    name: user.name,
    picture: user.image,
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: { id: user.id, email: user.email, name: user.name, image: user.image, workspaceId },
  }
}

/**
 * Exchanges a refresh token for a new pair (the old one is revoked).
 * Presenting an already-revoked token means it leaked or was replayed, so every
 * session of that user is revoked.
 */
export async function rotateMobileSession(refreshToken: string): Promise<MobileSessionPayload | null> {
  const tokenHash = hashToken(refreshToken)
  const [record] = await db
    .select()
    .from(mobileRefreshTokens)
    .where(eq(mobileRefreshTokens.tokenHash, tokenHash))
    .limit(1)

  if (!record) return null

  if (record.revokedAt) {
    await revokeAllMobileSessions(record.userId)
    return null
  }
  if (record.expiresAt.getTime() < Date.now()) return null

  // Only one concurrent request may win the rotation.
  const revoked = await db
    .update(mobileRefreshTokens)
    .set({ revokedAt: new Date(), lastUsedAt: new Date() })
    .where(and(eq(mobileRefreshTokens.id, record.id), isNull(mobileRefreshTokens.revokedAt)))
    .returning({ id: mobileRefreshTokens.id })
  if (revoked.length === 0) return null

  return createMobileSession(record.userId, record.deviceName)
}

export async function revokeMobileSession(refreshToken: string) {
  await db
    .update(mobileRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(mobileRefreshTokens.tokenHash, hashToken(refreshToken)), isNull(mobileRefreshTokens.revokedAt)))
}

export async function revokeAllMobileSessions(userId: string) {
  await db
    .update(mobileRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(mobileRefreshTokens.userId, userId), isNull(mobileRefreshTokens.revokedAt)))
}
