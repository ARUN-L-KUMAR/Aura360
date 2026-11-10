/**
 * Finds or creates the Aura360 user (plus OAuth link and default workspace) for a Google account.
 * Shared by the web NextAuth sign-in callback and the mobile Google endpoint.
 */

import { eq } from "drizzle-orm"
import { db, users, accounts, workspaces } from "@/lib/db"

type GoogleProfile = {
  email: string
  name?: string | null
  image?: string | null
}

type GoogleAccount = {
  type: string
  provider: string
  providerAccountId: string
  access_token?: string | null
  expires_at?: number | null
  token_type?: string | null
  scope?: string | null
  id_token?: string | null
}

export async function ensureGoogleUser(profile: GoogleProfile, account: GoogleAccount): Promise<string> {
  const [existingUser] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
  if (existingUser) return existingUser.id

  const [newUser] = await db
    .insert(users)
    .values({
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      image: profile.image,
      emailVerified: new Date(),
    })
    .returning()

  await db.insert(accounts).values({
    userId: newUser.id,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    access_token: account.access_token,
    expires_at: account.expires_at,
    token_type: account.token_type,
    scope: account.scope,
    id_token: account.id_token,
  })

  const slug = `${profile.email.split("@")[0]}-${Date.now()}`
  await db.insert(workspaces).values({
    name: `${newUser.name}'s Workspace`,
    slug,
    ownerId: newUser.id,
  })

  return newUser.id
}
