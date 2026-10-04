import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, aiInteractions, auditLogs } from "@/lib/db"
import { and, eq, desc, gte, count, sum } from "drizzle-orm"

/**
 * GET /api/ai/activity
 * Returns AI agent usage stats and recent audit trail for the current user.
 * Used by the AI activity dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get("days") ?? "7"), 30)

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Recent AI interactions
    const [interactions, [totalStats], agentAuditLogs] = await Promise.all([
      db
        .select()
        .from(aiInteractions)
        .where(
          and(
            eq(aiInteractions.userId, userId),
            gte(aiInteractions.createdAt, since)
          )
        )
        .orderBy(desc(aiInteractions.createdAt))
        .limit(50),

      // Aggregated stats
      db
        .select({
          totalRequests: count(),
          totalTokens: sum(aiInteractions.totalTokens),
        })
        .from(aiInteractions)
        .where(
          and(
            eq(aiInteractions.userId, userId),
            gte(aiInteractions.createdAt, since)
          )
        ),

      // AI-originated mutations in audit log
      db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, userId),
            gte(auditLogs.timestamp, since)
          )
        )
        .orderBy(desc(auditLogs.timestamp))
        .limit(20),
    ])

    const aiAgentAuditLogs = agentAuditLogs.filter(
      (l) => (l.metadata as any)?.source === "ai_agent"
    )

    return NextResponse.json({
      period: `Last ${days} days`,
      stats: {
        totalRequests: totalStats?.totalRequests ?? 0,
        totalTokens: totalStats?.totalTokens ?? 0,
        aiMutations: aiAgentAuditLogs.length,
      },
      interactions: interactions.slice(0, 20),
      aiMutations: aiAgentAuditLogs,
    })
  } catch (err) {
    console.error("[GET /api/ai/activity]", err)
    return NextResponse.json({ error: "Failed to fetch AI activity" }, { status: 500 })
  }
}
