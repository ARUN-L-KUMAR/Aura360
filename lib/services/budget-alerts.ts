/**
 * Budget Alert Service
 *
 * Checks if any budgets have exceeded their alert threshold and
 * creates in-app notifications for the user. Called after transactions are created.
 */

import { db, notifications, budgets, transactions } from "@/lib/db"
import { and, eq, gte, lte, sum } from "drizzle-orm"
import type { WorkspaceContext } from "@/lib/db"

export async function checkBudgetAlerts(
  ctx: WorkspaceContext,
  category: string,
  month: string // YYYY-MM format
): Promise<void> {
  try {
    // Find budget for this category and month
    const [budget] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.workspaceId, ctx.workspaceId),
          eq(budgets.userId, ctx.userId),
          eq(budgets.category, category),
          eq(budgets.month, month)
        )
      )
      .limit(1)

    if (!budget) return

    const budgetLimit = parseFloat(budget.amount || "0")
    if (budgetLimit <= 0) return

    // Sum spending in this category for the month
    const monthStart = `${month}-01`
    const monthEnd = `${month}-31`

    const [spendResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, ctx.workspaceId),
          eq(transactions.userId, ctx.userId),
          eq(transactions.category, category),
          eq(transactions.type, "expense"),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd)
        )
      )

    const spent = parseFloat(String(spendResult?.total ?? "0"))
    const threshold = (budget.alertThreshold ?? 80) / 100
    const percentage = (spent / budgetLimit) * 100

    // Check if we should send an alert
    if (percentage >= (budget.alertThreshold ?? 80)) {
      const isOver = spent > budgetLimit
      const title = isOver
        ? `⚠️ Budget Exceeded: ${category}`
        : `🔔 Budget Alert: ${category}`
      const message = isOver
        ? `You've spent ₹${spent.toFixed(0)} of your ₹${budgetLimit.toFixed(0)} ${category} budget — ${(percentage - 100).toFixed(0)}% over limit.`
        : `You've used ${percentage.toFixed(0)}% of your ₹${budgetLimit.toFixed(0)} ${category} budget (₹${spent.toFixed(0)} spent).`

      // Avoid duplicate alerts — check if a similar one was created today
      const today = new Date().toISOString().split("T")[0]

      // Insert notification (allow duplicates day-wise for now)
      await db.insert(notifications).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        title,
        message,
        type: isOver ? "warning" : "info",
        actionUrl: "/dashboard/finance?tab=budgets",
        metadata: { category, month, percentage: percentage.toFixed(1), source: "budget_alert" },
      })
    }
  } catch (err) {
    // Never block the main flow
    console.warn("[BudgetAlert] Error checking budget alerts:", err)
  }
}
