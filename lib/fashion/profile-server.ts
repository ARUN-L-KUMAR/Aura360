import { and, eq } from "drizzle-orm"
import { db, fashionProfiles } from "@/lib/db"
import type { FashionProfileData } from "@/lib/fashion/profile"

/**
 * Loads the user's saved fashion profile for server-side use (AI prompts).
 * Returns null when there isn't one, or if the table hasn't been created yet, so callers never break.
 */
export async function loadFashionProfile(ctx: { workspaceId: string; userId: string }): Promise<FashionProfileData | null> {
  try {
    const [row] = await db
      .select({ data: fashionProfiles.data })
      .from(fashionProfiles)
      .where(and(eq(fashionProfiles.workspaceId, ctx.workspaceId), eq(fashionProfiles.userId, ctx.userId)))
      .limit(1)
    return (row?.data as FashionProfileData | undefined) ?? null
  } catch (error) {
    console.warn("[Fashion Profile] could not load profile:", (error as Error)?.message)
    return null
  }
}
