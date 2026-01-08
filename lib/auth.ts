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
import { users, workspaces, workspaceMembers, accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

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

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1)

        if (!user || !user.password) {
          throw new Error("Invalid email or password")
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in")
        }

        // Verify password
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
          throw new Error("Invalid email or password")
        }

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
      // Initial sign in
      if (user && user.id) {
        token.id = user.id

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

      // Update session
      if (trigger === "update" && session?.workspaceId) {
        token.workspaceId = session.workspaceId
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.workspaceId = token.workspaceId as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // For OAuth providers, ensure user exists in database
      if (account?.provider === "google" && user.email) {
        // Check if user exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1)

        if (!existingUser) {
          // Create user
          const [newUser] = await db.insert(users).values({
            email: user.email,
            name: user.name || user.email.split("@")[0],
            image: user.image,
            emailVerified: new Date(),
          }).returning()

          // Create OAuth account link
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

          // Create default workspace
          const slug = `${user.email.split("@")[0]}-${Date.now()}`
          await db.insert(workspaces).values({
            name: `${newUser.name}'s Workspace`,
            slug,
            ownerId: newUser.id,
          })

          user.id = newUser.id
        } else {
          user.id = existingUser.id
        }
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
