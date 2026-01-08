/**
 * Email Verification API
 * Validates token and marks email as verified
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, verificationTokens } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get("token")

        if (!token) {
            return NextResponse.redirect(
                new URL("/auth/login?error=missing_token", request.url)
            )
        }

        // Find the verification token
        const [verificationToken] = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.token, token))
            .limit(1)

        if (!verificationToken) {
            return NextResponse.redirect(
                new URL("/auth/login?error=invalid_token", request.url)
            )
        }

        // Check if token is expired
        if (new Date() > verificationToken.expires) {
            // Delete expired token
            await db
                .delete(verificationTokens)
                .where(eq(verificationTokens.token, token))

            return NextResponse.redirect(
                new URL("/auth/login?error=expired_token", request.url)
            )
        }

        // Update user's emailVerified
        await db
            .update(users)
            .set({
                emailVerified: new Date(),
                updatedAt: new Date()
            })
            .where(eq(users.email, verificationToken.identifier))

        // Delete used token
        await db
            .delete(verificationTokens)
            .where(eq(verificationTokens.token, token))

        // Redirect to login with success message
        return NextResponse.redirect(
            new URL("/auth/login?verified=true", request.url)
        )
    } catch (error) {
        console.error("[Verify Email Error]", error)
        return NextResponse.redirect(
            new URL("/auth/login?error=verification_failed", request.url)
        )
    }
}
