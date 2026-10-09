/**
 * Email + password check shared by the web (NextAuth) and mobile login.
 * Throws an Error with a user-facing message on failure.
 */

import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db, users } from "@/lib/db"

export async function verifyCredentials(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user || !user.password) {
    throw new Error("Invalid email or password")
  }

  if (!user.emailVerified) {
    throw new Error("Please verify your email before signing in")
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new Error("Invalid email or password")
  }

  return user
}
