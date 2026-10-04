import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, budgets, transactions } from "@/lib/db"
import { eq, and, sql, desc, or, isNull } from "drizzle-orm"

// GET /api/finance/budgets?month=YYYY-MM
export async function GET(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    
    // Default to current month YYYY-MM if not provided
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const month = searchParams.get("month") || currentMonth

    // Fetch budgets for this workspace & user (either specific to this month or baseline null month)
    const userBudgets = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.workspaceId, context.workspaceId),
          eq(budgets.userId, context.userId),
          or(eq(budgets.month, month), isNull(budgets.month))
        )
      )
      .orderBy(desc(budgets.createdAt))

    // Fetch actual expense amounts spent in this month grouped by category
    const expenseSpending = await db
      .select({
        category: transactions.category,
        totalSpent: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS NUMERIC)), 0)::text`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId),
          eq(transactions.type, "expense"),
          sql`${transactions.date}::text LIKE ${month + '%'}`
        )
      )
      .groupBy(transactions.category)

    // Build spending map
    const spendingMap = new Map<string, number>()
    let totalExpenseInMonth = 0

    expenseSpending.forEach((row) => {
      const amt = parseFloat(row.totalSpent || "0")
      spendingMap.set(row.category.toLowerCase().trim(), amt)
      totalExpenseInMonth += amt
    })

    // Deduplicate budgets: if a month-specific budget exists for a category, prefer it over baseline
    const categoryBudgetMap = new Map<string, typeof userBudgets[0]>()
    for (const b of userBudgets) {
      const key = b.category.toLowerCase().trim()
      const existing = categoryBudgetMap.get(key)
      if (!existing || (!existing.month && b.month)) {
        categoryBudgetMap.set(key, b)
      }
    }

    const uniqueBudgets = Array.from(categoryBudgetMap.values())

    // Enrich budgets with actual spend data
    let totalCategoryBudgeted = 0
    let overallBudgetRecord: typeof userBudgets[0] | null = null

    const enrichedBudgets = uniqueBudgets.map((b) => {
      const budgetAmount = parseFloat(b.amount.toString())
      const isOverall = b.category === "__OVERALL__" || b.category.toLowerCase() === "overall"
      
      if (isOverall) {
        overallBudgetRecord = b
      } else {
        totalCategoryBudgeted += budgetAmount
      }

      const spent = isOverall 
        ? totalExpenseInMonth 
        : (spendingMap.get(b.category.toLowerCase().trim()) || 0)

      const remaining = Math.max(0, budgetAmount - spent)
      const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0
      const threshold = b.alertThreshold || 80

      return {
        id: b.id,
        workspaceId: b.workspaceId,
        userId: b.userId,
        category: b.category,
        amount: budgetAmount,
        period: b.period,
        month: b.month,
        alertThreshold: threshold,
        spent,
        remaining,
        percentage,
        isOverBudget: spent > budgetAmount,
        isNearLimit: percentage >= threshold && spent <= budgetAmount,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }
    })

    const overallCap = overallBudgetRecord 
      ? parseFloat((overallBudgetRecord as any).amount.toString()) 
      : totalCategoryBudgeted

    const overallSpent = totalExpenseInMonth
    const overallRemaining = Math.max(0, overallCap - overallSpent)
    const overallPercentage = overallCap > 0 ? Math.round((overallSpent / overallCap) * 100) : 0

    return NextResponse.json({
      success: true,
      data: enrichedBudgets,
      summary: {
        month,
        totalBudgeted: totalCategoryBudgeted,
        overallCap,
        totalSpent: overallSpent,
        remaining: overallRemaining,
        percentage: overallPercentage,
        isOverBudget: overallSpent > overallCap,
        hasOverallBudget: overallBudgetRecord !== null,
        categoriesCount: enrichedBudgets.filter(b => b.category !== "__OVERALL__").length,
      }
    })
  } catch (error: any) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch budgets" },
      { status: 500 }
    )
  }
}

// POST /api/finance/budgets - Create or update budget
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const { category, amount, month, alertThreshold = 80, period = "monthly" } = body

    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 }
      )
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Budget amount must be a positive number" },
        { status: 400 }
      )
    }

    const normalizedCategory = category.trim()
    const targetMonth = month ? month.trim() : null

    // Check if an existing budget exists for this workspace, user, month, and category
    const conditions = [
      eq(budgets.workspaceId, context.workspaceId),
      eq(budgets.userId, context.userId),
      eq(budgets.category, normalizedCategory),
    ]

    if (targetMonth) {
      conditions.push(eq(budgets.month, targetMonth))
    } else {
      conditions.push(isNull(budgets.month))
    }

    const [existing] = await db
      .select()
      .from(budgets)
      .where(and(...conditions))
      .limit(1)

    let result
    if (existing) {
      const [updated] = await db
        .update(budgets)
        .set({
          amount: numericAmount.toFixed(2),
          alertThreshold: Number(alertThreshold) || 80,
          period,
          updatedAt: new Date(),
        })
        .where(eq(budgets.id, existing.id))
        .returning()
      result = updated
    } else {
      const [inserted] = await db
        .insert(budgets)
        .values({
          workspaceId: context.workspaceId,
          userId: context.userId,
          category: normalizedCategory,
          amount: numericAmount.toFixed(2),
          period,
          month: targetMonth,
          alertThreshold: Number(alertThreshold) || 80,
        })
        .returning()
      result = inserted
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: existing ? "Budget updated successfully" : "Budget created successfully"
    })
  } catch (error: any) {
    console.error("Error saving budget:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save budget" },
      { status: 500 }
    )
  }
}

// DELETE /api/finance/budgets?id=UUID
export async function DELETE(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Budget ID is required" },
        { status: 400 }
      )
    }

    const [deleted] = await db
      .delete(budgets)
      .where(
        and(
          eq(budgets.id, id),
          eq(budgets.workspaceId, context.workspaceId),
          eq(budgets.userId, context.userId)
        )
      )
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Budget not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Budget deleted successfully",
      data: deleted,
    })
  } catch (error: any) {
    console.error("Error deleting budget:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete budget" },
      { status: 500 }
    )
  }
}
