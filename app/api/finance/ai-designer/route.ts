import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions, budgets, subscriptions } from "@/lib/db"
import { eq, and, sql, desc, gte } from "drizzle-orm"
import { openaiGroqClient } from "@/lib/ai/openai-groq-client"
import { geminiClient } from "@/lib/ai/gemini-client"
import { FAST_MODEL, getProviderForModel } from "@/lib/ai/types"

export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json().catch(() => ({}))
    const { framework = "50-30-20", targetMonthlyIncome, customGoals } = body

    // 1. Fetch recent transactions for the past 90 days to derive realistic cashflow patterns
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const ninetyDaysStr = ninetyDaysAgo.toISOString().split("T")[0]

    const recentTxns = await db
      .select({
        type: transactions.type,
        category: transactions.category,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId),
          gte(transactions.date, ninetyDaysStr)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(300)

    // 2. Fetch existing active budgets & subscriptions
    const existingBudgets = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.workspaceId, context.workspaceId),
          eq(budgets.userId, context.userId)
        )
      )

    const activeSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.workspaceId, context.workspaceId),
          eq(subscriptions.userId, context.userId)
        )
      )

    // Calculate detected monthly income and spending breakdown
    let totalIncome = 0
    let totalExpense = 0
    const categorySpend: Record<string, number> = {}

    recentTxns.forEach((t) => {
      const amt = parseFloat(t.amount.toString()) || 0
      if (t.type === "income") {
        totalIncome += amt
      } else if (t.type === "expense") {
        totalExpense += amt
        const cat = (t.category || "uncategorized").toLowerCase()
        categorySpend[cat] = (categorySpend[cat] || 0) + amt
      }
    })

    // Approximate monthly figures (90 days = ~3 months)
    const detectedMonthlyIncome = totalIncome > 0 ? Math.round((totalIncome / 3) * 100) / 100 : 5000
    const detectedMonthlyExpense = totalExpense > 0 ? Math.round((totalExpense / 3) * 100) / 100 : 3500
    const monthlyIncome = targetMonthlyIncome && targetMonthlyIncome > 0 ? targetMonthlyIncome : detectedMonthlyIncome

    const topCategories = Object.entries(categorySpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, amt]) => `${cat}: $${(amt / 3).toFixed(0)}/mo`)
      .join(", ")

    const subTotal = activeSubs.reduce((acc, s) => acc + (parseFloat(s.amount?.toString() || "0") || 0), 0)

    // Prompt the AI to architect the financial allocation
    const prompt = `
You are a elite wealth architect and certified financial planner for Aura360.
Design an optimal financial architecture blueprint for the following profile:

- Target Monthly Net Income: $${monthlyIncome.toFixed(2)}
- Chosen Strategic Framework: ${framework.toUpperCase()}
- Current Average Monthly Spending: $${detectedMonthlyExpense.toFixed(2)}
- Current Top Spending Categories: ${topCategories || "General living expenses"}
- Active Monthly Subscriptions: $${subTotal.toFixed(2)} (${activeSubs.length} active)
- User Preferences / Goals: ${customGoals || "Build emergency buffer, optimize living costs, and maximize growth investments"}

Rules:
1. Divide 100% of the $${monthlyIncome.toFixed(2)} monthly income into three distinct pillars:
   - "needs" (Essentials: Housing, Groceries, Utilities, Healthcare, Transportation)
   - "wants" (Lifestyle/Freedom: Dining out, Entertainment, Shopping, Travel, Fitness/Hobbies)
   - "wealth" (Wealth Engines: Emergency Fund, Investments/Index Funds, Retirement, Debt Overpayment)
2. Ensure the percentages sum up to 100%.
3. For each category under each pillar, provide realistic proposed monthly dollar budgets that map to typical budget categories (e.g., Housing, Groceries, Dining Out, Entertainment, Emergency Fund, Investments).
4. Provide 3 high-impact strategic observations highlighting savings levers or lifestyle optimizations.
5. Provide a 1-year projected net worth increase and emergency fund runway (in months).

Respond with ONLY valid JSON in this exact structure:
{
  "monthlyIncome": ${monthlyIncome},
  "framework": "${framework}",
  "allocation": {
    "needs": { "percentage": 50, "amount": 2500, "categories": [{ "name": "Housing", "amount": 1500 }, { "name": "Groceries", "amount": 600 }, { "name": "Utilities", "amount": 250 }, { "name": "Transport", "amount": 150 }] },
    "wants": { "percentage": 30, "amount": 1500, "categories": [{ "name": "Dining Out", "amount": 500 }, { "name": "Entertainment", "amount": 300 }, { "name": "Shopping", "amount": 400 }, { "name": "Travel & Fun", "amount": 300 }] },
    "wealth": { "percentage": 20, "amount": 1000, "categories": [{ "name": "Emergency Fund", "amount": 400 }, { "name": "Investments", "amount": 600 }] }
  },
  "metrics": {
    "projectedAnnualSavings": 12000,
    "projectedYearOneNetWorthIncrease": 13500,
    "emergencyRunwayMonths": 6.2,
    "debtFreedomAccelerationMonths": 8
  },
  "insights": [
    "Observation 1 regarding dining out or subscription optimization",
    "Observation 2 regarding emergency cushion pacing",
    "Observation 3 on long-term compound growth"
  ]
}
`.trim()

    let rawJson = ""
    try {
      const provider = getProviderForModel(FAST_MODEL)
      if (provider === "groq" || provider === "openai") {
        const res = await openaiGroqClient.generateText(
          {
            prompt,
            systemPrompt: "You are an automated financial system. Always respond with strict, raw JSON only.",
          },
          { model: FAST_MODEL }
        )
        rawJson = res.text
      } else {
        const res = await geminiClient.generateText(
          {
            prompt,
            systemPrompt: "You are an automated financial system. Always respond with strict, raw JSON only.",
          },
          { model: FAST_MODEL }
        )
        rawJson = res.text
      }
    } catch (llmErr) {
      console.warn("LLM generation failed, falling back to algorithmic architecture:", llmErr)
    }

    // Try parsing AI output or fallback to algorithmic calculation
    let blueprint
    try {
      const cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim()
      const jsonStart = cleanJson.indexOf("{")
      const jsonEnd = cleanJson.lastIndexOf("}")
      if (jsonStart !== -1 && jsonEnd !== -1) {
        blueprint = JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1))
      }
    } catch {
      blueprint = null
    }

    // Algorithmic Fallback if LLM parsing failed
    if (!blueprint || !blueprint.allocation) {
      let needsPct = 50
      let wantsPct = 30
      let wealthPct = 20

      if (framework === "fire") {
        needsPct = 35
        wantsPct = 15
        wealthPct = 50
      } else if (framework === "70-20-10") {
        needsPct = 70
        wantsPct = 10
        wealthPct = 20
      } else if (framework === "zero-based") {
        needsPct = 55
        wantsPct = 25
        wealthPct = 20
      }

      const needsAmt = Math.round(monthlyIncome * (needsPct / 100))
      const wantsAmt = Math.round(monthlyIncome * (wantsPct / 100))
      const wealthAmt = monthlyIncome - needsAmt - wantsAmt

      blueprint = {
        monthlyIncome,
        framework,
        allocation: {
          needs: {
            percentage: needsPct,
            amount: needsAmt,
            categories: [
              { name: "Housing", amount: Math.round(needsAmt * 0.55) },
              { name: "Groceries", amount: Math.round(needsAmt * 0.22) },
              { name: "Utilities", amount: Math.round(needsAmt * 0.12) },
              { name: "Transport", amount: Math.round(needsAmt * 0.11) },
            ],
          },
          wants: {
            percentage: wantsPct,
            amount: wantsAmt,
            categories: [
              { name: "Dining Out", amount: Math.round(wantsAmt * 0.4) },
              { name: "Shopping", amount: Math.round(wantsAmt * 0.3) },
              { name: "Entertainment", amount: Math.round(wantsAmt * 0.18) },
              { name: "Subscriptions", amount: Math.round(wantsAmt * 0.12) },
            ],
          },
          wealth: {
            percentage: wealthPct,
            amount: wealthAmt,
            categories: [
              { name: "Emergency Fund", amount: Math.round(wealthAmt * 0.45) },
              { name: "Investments", amount: Math.round(wealthAmt * 0.55) },
            ],
          },
        },
        metrics: {
          projectedAnnualSavings: wealthAmt * 12,
          projectedYearOneNetWorthIncrease: Math.round(wealthAmt * 12 * 1.05),
          emergencyRunwayMonths: Math.round((wealthAmt * 6) / (needsAmt || 1) * 10) / 10,
          debtFreedomAccelerationMonths: 6,
        },
        insights: [
          `Allocating ${wealthPct}% ($${wealthAmt}/mo) compounds into $${(wealthAmt * 12).toLocaleString()} saved in your first year alone.`,
          `Keeping essential living costs under $${needsAmt}/mo protects your cashflow buffer even during market shifts.`,
          `Capping discretionary lifestyle spending at $${wantsAmt}/mo eliminates emotional leaks while maintaining comfortable living standards.`,
        ],
      }
    }

    return NextResponse.json({
      success: true,
      blueprint,
      historicalContext: {
        detectedMonthlyIncome,
        detectedMonthlyExpense,
        recentTxnCount: recentTxns.length,
        existingBudgetCount: existingBudgets.length,
        activeSubscriptionsCount: activeSubs.length,
      },
    })
  } catch (error: any) {
    console.error("AI Finance Designer error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate financial architecture blueprint" },
      { status: 500 }
    )
  }
}
