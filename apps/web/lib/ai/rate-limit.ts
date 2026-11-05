/**
 * AI Rate Limiter — DB-based per-user rate limiting for /api/ai/chat
 *
 * Uses the existing aiInteractions table to count requests.
 * No external Redis needed — works with NeonDB out of the box.
 *
 * Limits:
 *   - 30 requests per hour per user (rolling window)
 *   - 150 requests per 24 hours per user
 */

import { db, aiInteractions } from "@/lib/db"
import { and, eq, gte, count } from "drizzle-orm"

const HOURLY_LIMIT = 30
const DAILY_LIMIT = 150

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  reason?: string
}

export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const now = new Date()

  // Rolling 1-hour window
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Count hourly requests
    const [hourlyCount] = await db
      .select({ count: count() })
      .from(aiInteractions)
      .where(
        and(
          eq(aiInteractions.userId, userId),
          gte(aiInteractions.createdAt, oneHourAgo)
        )
      )

    const hourlyUsed = hourlyCount?.count ?? 0

    if (hourlyUsed >= HOURLY_LIMIT) {
      const resetAt = new Date(oneHourAgo.getTime() + 60 * 60 * 1000)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        reason: `Hourly limit reached (${HOURLY_LIMIT} requests/hour). Resets at ${resetAt.toLocaleTimeString()}.`,
      }
    }

    // Count daily requests
    const [dailyCount] = await db
      .select({ count: count() })
      .from(aiInteractions)
      .where(
        and(
          eq(aiInteractions.userId, userId),
          gte(aiInteractions.createdAt, oneDayAgo)
        )
      )

    const dailyUsed = dailyCount?.count ?? 0

    if (dailyUsed >= DAILY_LIMIT) {
      const resetAt = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        reason: `Daily limit reached (${DAILY_LIMIT} requests/day). Resets tomorrow.`,
      }
    }

    return {
      allowed: true,
      remaining: Math.min(HOURLY_LIMIT - hourlyUsed, DAILY_LIMIT - dailyUsed),
      resetAt: new Date(now.getTime() + 60 * 60 * 1000),
    }
  } catch (err) {
    // If rate limit check fails (DB error), allow the request
    console.warn("[RateLimit] Rate limit check failed, allowing request:", err)
    return { allowed: true, remaining: HOURLY_LIMIT, resetAt: new Date() }
  }
}
