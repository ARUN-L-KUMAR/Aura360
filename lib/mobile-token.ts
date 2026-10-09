/**
 * Mobile access tokens: short-lived signed JWTs sent as `Authorization: Bearer <token>`.
 *
 * Edge-safe on purpose (jose only, no database) because middleware.ts imports it.
 * Long-lived refresh tokens live in lib/mobile-auth.ts.
 */

import { SignJWT, jwtVerify } from "jose"

const ISSUER = "aura360"
const AUDIENCE = "aura360-mobile"

export const ACCESS_TOKEN_TTL_SECONDS = 30 * 60

export type MobileTokenClaims = {
  userId: string
  workspaceId: string
  name?: string | null
  picture?: string | null
}

function getKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set")
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(claims: MobileTokenClaims): Promise<string> {
  return new SignJWT({
    wid: claims.workspaceId,
    name: claims.name ?? undefined,
    picture: claims.picture ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getKey())
}

/** Returns the claims, or null when the token is missing, malformed, expired or forged. */
export async function verifyAccessToken(token: string): Promise<MobileTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    })
    if (!payload.sub || typeof payload.wid !== "string") return null
    return {
      userId: payload.sub,
      workspaceId: payload.wid,
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
    }
  } catch {
    return null
  }
}

export function getBearerToken(headers: Headers): string | null {
  const value = headers.get("authorization")
  if (!value) return null
  const [scheme, token] = value.split(" ")
  return scheme?.toLowerCase() === "bearer" && token ? token : null
}
