/**
 * POST /api/ai/insights
 *
 * Generates AI-powered insights for a given module using the user's data.
 *
 * Request body:
 * {
 *   "module": "finance" | "fitness" | "food",
 *   "data": [ ...module-specific records ]
 * }
 *
 * Response:
 * {
 *   "insights": [{ id, module, title, description, severity, actionLabel?, actionUrl? }],
 *   "usage": { ... },
 *   "source": "ai" | "fallback"
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { insightsGenerator } from "@/lib/ai/services/insights-generator"

const insightsSchema = z.object({
  module: z.enum(["finance", "fitness", "food"]),
  data: z.array(z.record(z.unknown())).min(1).max(50),
  /** Optional: total wallet balance for finance insights */
  totalBalance: z.number().optional(),
  currency: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    await getWorkspaceContext()

    const body = await request.json()
    const parsed = insightsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { module, data, totalBalance, currency } = parsed.data
    let result

    if (module === "finance") {
      result = await insightsGenerator.generateFinanceInsights({
        transactions: data as any[],
        totalBalance,
        currency,
      })
    } else if (module === "fitness") {
      result = await insightsGenerator.generateFitnessInsights({ logs: data as any[] })
    } else {
      result = await insightsGenerator.generateFoodInsights({ logs: data as any[] })
    }

    return NextResponse.json({
      insights: result.data,
      usage: result.usage,
      source: result.source,
    })
  } catch (error) {
    console.error("[POST /api/ai/insights] error:", error)

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    )
  }
}
