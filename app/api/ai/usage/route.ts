import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { checkAiRateLimit } from "@/lib/ai/rate-limit"
import { db, aiInteractions } from "@/lib/db"
import { and, eq, gte, count, sum } from "drizzle-orm"

/**
 * GET /api/ai/usage
 * Returns the current user's AI usage stats and rate limit status.
 * Used by the Settings page AI Usage panel.
 */
export async function GET(_request: NextRequest) {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()

    const [rateLimit, todayStats, weekStats] = await Promise.all([
      checkAiRateLimit(userId),
      // Today's usage
      db
        .select({ count: count(), tokens: sum(aiInteractions.totalTokens) })
        .from(aiInteractions)
        .where(
          and(
            eq(aiInteractions.userId, userId),
            gte(aiInteractions.createdAt, new Date(new Date().setHours(0, 0, 0, 0)))
          )
        ),
      // This week's usage
      db
        .select({ count: count(), tokens: sum(aiInteractions.totalTokens) })
        .from(aiInteractions)
        .where(
          and(
            eq(aiInteractions.userId, userId),
            gte(aiInteractions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        ),
    ])

    return NextResponse.json({
      rateLimit: {
        allowed: rateLimit.allowed,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
        hourlyLimit: 30,
        dailyLimit: 150,
      },
      today: {
        requests: todayStats[0]?.count ?? 0,
        tokens: parseInt(String(todayStats[0]?.tokens ?? "0")),
      },
      week: {
        requests: weekStats[0]?.count ?? 0,
        tokens: parseInt(String(weekStats[0]?.tokens ?? "0")),
      },
    })
  } catch (err) {
    console.error("[GET /api/ai/usage]", err)
    return NextResponse.json({ error: "Failed to fetch AI usage" }, { status: 500 })
  }
}
