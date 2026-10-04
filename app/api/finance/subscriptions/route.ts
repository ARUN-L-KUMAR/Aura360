import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, subscriptions } from "@/lib/db"
import { eq, and, desc, sql } from "drizzle-orm"

// Helper to calculate next billing date
function calculateNextBillingDate(startDateStr: string, cycle: string, fromDate?: Date): string {
  const base = fromDate || new Date(startDateStr)
  const next = new Date(base)

  switch (cycle) {
    case "weekly":
      next.setDate(next.getDate() + 7)
      break
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      break
    case "quarterly":
      next.setMonth(next.getMonth() + 3)
      break
    case "semi_annually":
      next.setMonth(next.getMonth() + 6)
      break
    case "yearly":
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setMonth(next.getMonth() + 1)
  }

  return next.toISOString().split("T")[0]
}

// GET /api/finance/subscriptions
export async function GET(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")

    const conditions = [
      eq(subscriptions.workspaceId, context.workspaceId),
      eq(subscriptions.userId, context.userId),
    ]

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(subscriptions.status, statusFilter as any))
    }

    const items = await db
      .select()
      .from(subscriptions)
      .where(and(...conditions))
      .orderBy(desc(subscriptions.createdAt))

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let totalMonthlyBurnRate = 0
    let dueIn7DaysCount = 0
    let overdueCount = 0

    const enriched = items.map((sub) => {
      const amountNum = parseFloat(sub.amount.toString())

      // Normalized monthly equivalent
      let monthlyEquivalent = amountNum
      switch (sub.billingCycle) {
        case "weekly":
          monthlyEquivalent = amountNum * (52 / 12)
          break
        case "quarterly":
          monthlyEquivalent = amountNum / 3
          break
        case "semi_annually":
          monthlyEquivalent = amountNum / 6
          break
        case "yearly":
          monthlyEquivalent = amountNum / 12
          break
        case "monthly":
        default:
          monthlyEquivalent = amountNum
      }

      if (sub.status === "active") {
        totalMonthlyBurnRate += monthlyEquivalent
      }

      let daysUntilRenewal: number | null = null
      let isDueSoon = false
      let isOverdue = false

      if (sub.nextBillingDate) {
        const nextDate = new Date(sub.nextBillingDate)
        nextDate.setHours(0, 0, 0, 0)
        const diffDays = Math.round((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        daysUntilRenewal = diffDays

        if (sub.status === "active") {
          if (diffDays < 0) {
            isOverdue = true
            overdueCount++
          } else if (diffDays <= (sub.reminderDays || 7)) {
            isDueSoon = true
            if (diffDays <= 7) dueIn7DaysCount++
          }
        }
      }

      return {
        id: sub.id,
        workspaceId: sub.workspaceId,
        userId: sub.userId,
        name: sub.name,
        description: sub.description,
        amount: amountNum,
        currency: sub.currency || "INR",
        billingCycle: sub.billingCycle,
        startDate: sub.startDate,
        endDate: sub.endDate,
        nextBillingDate: sub.nextBillingDate,
        status: sub.status,
        paymentMethod: sub.paymentMethod,
        category: sub.category || "Subscriptions",
        reminderDays: sub.reminderDays || 7,
        autoRenew: sub.autoRenew ?? true,
        daysUntilRenewal,
        isDueSoon,
        isOverdue,
        monthlyEquivalent: Math.round(monthlyEquivalent * 100) / 100,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      }
    })

    return NextResponse.json({
      success: true,
      data: enriched,
      summary: {
        totalSubscriptions: items.length,
        activeCount: items.filter((s) => s.status === "active").length,
        pausedCount: items.filter((s) => s.status === "pending").length,
        cancelledCount: items.filter((s) => s.status === "cancelled" || s.status === "expired").length,
        monthlyBurnRate: Math.round(totalMonthlyBurnRate),
        yearlyBurnRate: Math.round(totalMonthlyBurnRate * 12),
        dueIn7DaysCount,
        overdueCount,
      },
    })
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subscriptions" },
      { status: 500 }
    )
  }
}

// POST /api/finance/subscriptions - Create new subscription
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const {
      name,
      description,
      amount,
      currency = "INR",
      billingCycle = "monthly",
      startDate,
      nextBillingDate,
      status = "active",
      paymentMethod,
      category = "Subscriptions",
      reminderDays = 7,
      autoRenew = true,
    } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Subscription name is required" },
        { status: 400 }
      )
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Subscription amount must be a positive number" },
        { status: 400 }
      )
    }

    const effectiveStartDate = startDate || new Date().toISOString().split("T")[0]
    const effectiveNextBilling =
      nextBillingDate || calculateNextBillingDate(effectiveStartDate, billingCycle)

    const [newSub] = await db
      .insert(subscriptions)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        name: name.trim(),
        description: description?.trim() || null,
        amount: numericAmount.toFixed(2),
        currency,
        billingCycle,
        startDate: effectiveStartDate,
        nextBillingDate: effectiveNextBilling,
        status,
        paymentMethod: paymentMethod || null,
        category: category?.trim() || "Subscriptions",
        reminderDays: Number(reminderDays) || 7,
        autoRenew: Boolean(autoRenew),
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: newSub,
      message: "Subscription added successfully",
    })
  } catch (error: any) {
    console.error("Error adding subscription:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add subscription" },
      { status: 500 }
    )
  }
}

// PUT /api/finance/subscriptions - Update or renew subscription
export async function PUT(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const { id, markRenewed, ...fields } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subscription ID is required" },
        { status: 400 }
      )
    }

    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, id),
          eq(subscriptions.workspaceId, context.workspaceId),
          eq(subscriptions.userId, context.userId)
        )
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      )
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (markRenewed) {
      // Advance next billing date by billing cycle
      const baseDate = existing.nextBillingDate ? new Date(existing.nextBillingDate) : new Date()
      updateData.nextBillingDate = calculateNextBillingDate(
        existing.startDate,
        existing.billingCycle,
        baseDate
      )
      updateData.status = "active"
    } else {
      if (fields.name !== undefined) updateData.name = fields.name.trim()
      if (fields.description !== undefined) updateData.description = fields.description?.trim() || null
      if (fields.amount !== undefined) {
        const amt = parseFloat(fields.amount)
        if (!isNaN(amt) && amt > 0) updateData.amount = amt.toFixed(2)
      }
      if (fields.billingCycle !== undefined) updateData.billingCycle = fields.billingCycle
      if (fields.startDate !== undefined) updateData.startDate = fields.startDate
      if (fields.endDate !== undefined) updateData.endDate = fields.endDate || null
      if (fields.nextBillingDate !== undefined) updateData.nextBillingDate = fields.nextBillingDate || null
      if (fields.status !== undefined) updateData.status = fields.status
      if (fields.paymentMethod !== undefined) updateData.paymentMethod = fields.paymentMethod || null
      if (fields.category !== undefined) updateData.category = fields.category?.trim() || null
      if (fields.reminderDays !== undefined) updateData.reminderDays = Number(fields.reminderDays) || 7
      if (fields.autoRenew !== undefined) updateData.autoRenew = Boolean(fields.autoRenew)
    }

    const [updated] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      data: updated,
      message: markRenewed ? "Subscription marked renewed" : "Subscription updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update subscription" },
      { status: 500 }
    )
  }
}

// DELETE /api/finance/subscriptions?id=UUID
export async function DELETE(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subscription ID is required" },
        { status: 400 }
      )
    }

    const [deleted] = await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.id, id),
          eq(subscriptions.workspaceId, context.workspaceId),
          eq(subscriptions.userId, context.userId)
        )
      )
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Subscription not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Subscription deleted successfully",
      data: deleted,
    })
  } catch (error: any) {
    console.error("Error deleting subscription:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete subscription" },
      { status: 500 }
    )
  }
}
