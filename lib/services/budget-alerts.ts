/**
 * Budget Alert Service
 *
 * Notifies the user when a category budget reaches its alert threshold or goes over. Runs after
 * transactions are created (web, bulk import, AI chat) and once a day from the scheduled job, which also
 * covers edits and imports. Each budget alerts once per month per level (threshold, over), so repeats never spam.
 */

import { db, budgets, transactions } from "@/lib/db"
import { and, eq, gte, lte, sum } from "drizzle-orm"
import type { WorkspaceContext } from "@/lib/db"
import { notify, type NotifyResult } from "@/lib/notifications/dispatch"
import { loadPrefs, type NotificationPrefs } from "@/lib/notifications/preferences"
import { monthEnd } from "@/lib/notifications/time"

export async function checkBudgetAlerts(
  ctx: WorkspaceContext,
  category: string,
  month: string, // YYYY-MM format
  options: { prefs?: NotificationPrefs; now?: Date; dryRun?: boolean } = {}
): Promise<NotifyResult | null> {
  try {
    const prefs = options.prefs ?? (await loadPrefs(ctx.userId))
    if (!prefs.budget.enabled) return null

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

    if (!budget) return null

    const budgetLimit = parseFloat(budget.amount || "0")
    if (budgetLimit <= 0) return null

    // Sum spending in this category for the month (monthEnd handles 28/29/30/31-day months)
    const [spendResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, ctx.workspaceId),
          eq(transactions.userId, ctx.userId),
          eq(transactions.category, category),
          eq(transactions.type, "expense"),
          gte(transactions.date, `${month}-01`),
          lte(transactions.date, monthEnd(month))
        )
      )

    const spent = parseFloat(String(spendResult?.total ?? "0"))
    const threshold = budget.alertThreshold ?? 80
    const percentage = (spent / budgetLimit) * 100
    if (percentage < threshold) return null

    const isOver = spent > budgetLimit
    const title = isOver ? `⚠️ Budget exceeded: ${category}` : `🔔 Budget alert: ${category}`
    const message = isOver
      ? `You've spent ₹${spent.toFixed(0)} of your ₹${budgetLimit.toFixed(0)} ${category} budget, ${(percentage - 100).toFixed(0)}% over the limit.`
      : `You've used ${percentage.toFixed(0)}% of your ₹${budgetLimit.toFixed(0)} ${category} budget (₹${spent.toFixed(0)} spent).`

    return await notify({
      ctx,
      kind: "budget",
      title,
      message,
      type: isOver ? "warning" : "info",
      actionUrl: "/dashboard/finance?tab=budgets",
      dedupeKey: `budget:${budget.id}:${month}:${isOver ? "over" : "threshold"}`,
      metadata: { category, month, percentage: percentage.toFixed(1) },
      prefs,
      now: options.now,
      dryRun: options.dryRun,
    })
  } catch (err) {
    // Never block the main flow
    console.warn("[BudgetAlert] Error checking budget alerts:", err)
    return null
  }
}

/** After new transactions are saved: check the budget of each (category, month) they touched. */
export async function checkBudgetsForTransactions(
  ctx: WorkspaceContext,
  rows: Array<{ type: string; category: string; date: string | Date }>
): Promise<void> {
  const pairs = new Map<string, { category: string; month: string }>()
  for (const row of rows) {
    if (row.type !== "expense") continue
    const month = (row.date instanceof Date ? row.date.toISOString() : String(row.date)).slice(0, 7)
    if (/^\d{4}-\d{2}$/.test(month)) pairs.set(`${row.category}|${month}`, { category: row.category, month })
  }
  if (pairs.size === 0) return

  const prefs = await loadPrefs(ctx.userId)
  for (const { category, month } of pairs.values()) {
    await checkBudgetAlerts(ctx, category, month, { prefs })
  }
}
