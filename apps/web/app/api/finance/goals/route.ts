import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, financialGoals } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"

// GET /api/finance/goals
export async function GET() {
  try {
    const context = await getWorkspaceContext()

    const goals = await db
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.workspaceId, context.workspaceId),
          eq(financialGoals.userId, context.userId)
        )
      )
      .orderBy(desc(financialGoals.createdAt))

    const now = new Date()

    const enrichedGoals = goals.map((g) => {
      const target = parseFloat(g.targetAmount.toString())
      const current = parseFloat(g.currentAmount.toString())
      const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      const remaining = Math.max(0, target - current)

      let daysRemaining: number | null = null
      if (g.targetDate) {
        const targetD = new Date(g.targetDate)
        const diffTime = targetD.getTime() - now.getTime()
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      return {
        id: g.id,
        workspaceId: g.workspaceId,
        userId: g.userId,
        title: g.title,
        targetAmount: target,
        currentAmount: current,
        targetDate: g.targetDate,
        category: g.category || "Savings",
        color: g.color || "#3b82f6",
        notes: g.notes,
        status: g.status,
        percentage,
        remaining,
        daysRemaining,
        isCompleted: g.status === "completed" || current >= target,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }
    })

    const totalTarget = enrichedGoals.reduce((sum, g) => sum + g.targetAmount, 0)
    const totalSaved = enrichedGoals.reduce((sum, g) => sum + g.currentAmount, 0)
    const totalRemaining = Math.max(0, totalTarget - totalSaved)
    const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

    return NextResponse.json({
      success: true,
      data: enrichedGoals,
      summary: {
        totalGoals: enrichedGoals.length,
        inProgressCount: enrichedGoals.filter((g) => g.status === "in_progress" && !g.isCompleted).length,
        completedCount: enrichedGoals.filter((g) => g.isCompleted).length,
        totalTarget,
        totalSaved,
        totalRemaining,
        overallProgress,
      },
    })
  } catch (error: any) {
    console.error("Error fetching financial goals:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch financial goals" },
      { status: 500 }
    )
  }
}

// POST /api/finance/goals - Create new goal
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const { title, targetAmount, currentAmount = 0, targetDate, category = "Savings", color = "#3b82f6", notes } = body

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Goal title is required" },
        { status: 400 }
      )
    }

    const numericTarget = parseFloat(targetAmount)
    if (isNaN(numericTarget) || numericTarget <= 0) {
      return NextResponse.json(
        { success: false, error: "Target amount must be a positive number" },
        { status: 400 }
      )
    }

    const numericCurrent = parseFloat(currentAmount) || 0

    const [newGoal] = await db
      .insert(financialGoals)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        title: title.trim(),
        targetAmount: numericTarget.toFixed(2),
        currentAmount: numericCurrent.toFixed(2),
        targetDate: targetDate ? targetDate : null,
        category: category.trim(),
        color,
        notes: notes?.trim() || null,
        status: numericCurrent >= numericTarget ? "completed" : "in_progress",
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: newGoal,
      message: "Financial goal created successfully",
    })
  } catch (error: any) {
    console.error("Error creating financial goal:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create financial goal" },
      { status: 500 }
    )
  }
}

// PUT /api/finance/goals - Update goal or contribute funds
export async function PUT(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const { id, title, targetAmount, currentAmount, contributeAmount, targetDate, category, color, notes, status } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Goal ID is required" },
        { status: 400 }
      )
    }

    const [existing] = await db
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, id),
          eq(financialGoals.workspaceId, context.workspaceId),
          eq(financialGoals.userId, context.userId)
        )
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Goal not found" },
        { status: 404 }
      )
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (title !== undefined) updateData.title = title.trim()
    if (category !== undefined) updateData.category = category.trim()
    if (color !== undefined) updateData.color = color
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (targetDate !== undefined) updateData.targetDate = targetDate || null
    if (status !== undefined) updateData.status = status

    let newCurrent = parseFloat(existing.currentAmount.toString())

    if (contributeAmount !== undefined) {
      const contrib = parseFloat(contributeAmount)
      if (!isNaN(contrib) && contrib > 0) {
        newCurrent += contrib
      }
    } else if (currentAmount !== undefined) {
      const parsed = parseFloat(currentAmount)
      if (!isNaN(parsed) && parsed >= 0) {
        newCurrent = parsed
      }
    }

    updateData.currentAmount = newCurrent.toFixed(2)

    if (targetAmount !== undefined) {
      const parsedTarget = parseFloat(targetAmount)
      if (!isNaN(parsedTarget) && parsedTarget > 0) {
        updateData.targetAmount = parsedTarget.toFixed(2)
      }
    }

    const targetVal = updateData.targetAmount ? parseFloat(updateData.targetAmount) : parseFloat(existing.targetAmount.toString())
    if (newCurrent >= targetVal && !status) {
      updateData.status = "completed"
    } else if (newCurrent < targetVal && existing.status === "completed" && !status) {
      updateData.status = "in_progress"
    }

    const [updated] = await db
      .update(financialGoals)
      .set(updateData)
      .where(eq(financialGoals.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Goal updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating goal:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update goal" },
      { status: 500 }
    )
  }
}

// DELETE /api/finance/goals?id=UUID
export async function DELETE(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Goal ID is required" },
        { status: 400 }
      )
    }

    const [deleted] = await db
      .delete(financialGoals)
      .where(
        and(
          eq(financialGoals.id, id),
          eq(financialGoals.workspaceId, context.workspaceId),
          eq(financialGoals.userId, context.userId)
        )
      )
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Goal not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Goal deleted successfully",
      data: deleted,
    })
  } catch (error: any) {
    console.error("Error deleting goal:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete goal" },
      { status: 500 }
    )
  }
}
