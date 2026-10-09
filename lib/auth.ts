/**
 * NextAuth Configuration
 * 
 * Providers:
 * - Credentials (email/password with bcrypt)
 * - Google OAuth
 * 
 * Features:
 * - Drizzle adapter for database sessions
 * - JWT strategy for edge compatibility
 * - Workspace context in session
 */

import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { db } from "@/lib/db"
import { workspaces } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyCredentials } from "@/lib/credentials"
import { ensureGoogleUser } from "@/lib/google-user"

export const authConfig: NextAuthConfig = {
  // No adapter needed for JWT strategy
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const user = await verifyCredentials(
          credentials.email as string,
          credentials.password as string
        )

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - populate token from user object
      if (user && user.id) {
        token.id = user.id
        token.name = user.name
        token.picture = user.image

        // Get user's primary workspace
        const [workspace] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.ownerId, user.id))
          .limit(1)

        if (workspace) {
          token.workspaceId = workspace.id
        }
      }

      // Update session logic
      if (trigger === "update" && session) {
        if (session.workspaceId) token.workspaceId = session.workspaceId
        if (session.name) token.name = session.name
        if (session.image) token.picture = session.image
        // Also support direct 'picture' if passed
        if (session.picture) token.picture = session.picture
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.workspaceId = token.workspaceId as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // For OAuth providers, ensure user exists in database
      if (account?.provider === "google" && user.email) {
        user.id = await ensureGoogleUser(
          { email: user.email, name: user.name, image: user.image },
          account
        )
      }
      return true
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
