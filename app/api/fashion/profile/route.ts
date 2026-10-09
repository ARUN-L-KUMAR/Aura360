/**
 * Fashion Profile API (the signed-in user's measurements, sizes, looks and style basics)
 * GET /api/fashion/profile  - fetch the saved profile ({ profile: null } if nothing saved yet)
 * PUT /api/fashion/profile  - save the profile (replaces the stored data)
 */

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, fashionProfiles } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { fashionProfileSchema } from "@/lib/fashion/profile"

// Postgres "undefined_table": the setup script hasn't been run yet
const isMissingTable = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } }
  return (e?.code ?? e?.cause?.code) === "42P01"
}

const SETUP_MESSAGE = "The fashion profile table doesn't exist yet. Run: npm run db:create-fashion-profile"

export async function GET() {
  try {
    const context = await getWorkspaceContext()
    const [row] = await db
      .select()
      .from(fashionProfiles)
      .where(and(eq(fashionProfiles.workspaceId, context.workspaceId), eq(fashionProfiles.userId, context.userId)))
      .limit(1)

    return NextResponse.json({ profile: row?.data ?? null, updatedAt: row?.updatedAt ?? null })
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    console.error("[Fashion Profile API] GET error:", error)
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()

    const parsed = fashionProfileSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid profile data", details: parsed.error.errors }, { status: 400 })
    }

    // Drop empty values so cleared fields don't linger
    const data = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    )

    const [saved] = await db
      .insert(fashionProfiles)
      .values({ ...context, data })
      .onConflictDoUpdate({
        target: fashionProfiles.userId,
        set: { data, workspaceId: context.workspaceId, updatedAt: new Date() },
      })
      .returning()

    return NextResponse.json({ profile: saved.data, updatedAt: saved.updatedAt })
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    console.error("[Fashion Profile API] PUT error:", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}
