import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions } from "@/lib/db"
import { eq, and, inArray } from "drizzle-orm"

// POST /api/finance/transactions/batch
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const { action, ids, category, parentId, splits } = body

    // 1. BULK DELETE
    if (action === "delete") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "No transaction IDs provided for deletion" },
          { status: 400 }
        )
      }

      const deleted = await db
        .delete(transactions)
        .where(
          and(
            inArray(transactions.id, ids),
            eq(transactions.workspaceId, context.workspaceId),
            eq(transactions.userId, context.userId)
          )
        )
        .returning({ id: transactions.id })

      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted.length} transactions successfully`,
        deletedCount: deleted.length,
      })
    }

    // 2. BULK CATEGORY UPDATE
    if (action === "updateCategory") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "No transaction IDs provided" },
          { status: 400 }
        )
      }

      if (!category || typeof category !== "string" || !category.trim()) {
        return NextResponse.json(
          { success: false, error: "Target category name is required" },
          { status: 400 }
        )
      }

      const updated = await db
        .update(transactions)
        .set({
          category: category.trim(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(transactions.id, ids),
            eq(transactions.workspaceId, context.workspaceId),
            eq(transactions.userId, context.userId)
          )
        )
        .returning({ id: transactions.id })

      return NextResponse.json({
        success: true,
        message: `Updated category to "${category}" for ${updated.length} transactions`,
        updatedCount: updated.length,
      })
    }

    // 3. SPLIT TRANSACTION
    if (action === "split") {
      if (!parentId) {
        return NextResponse.json(
          { success: false, error: "Parent transaction ID is required" },
          { status: 400 }
        )
      }

      if (!Array.isArray(splits) || splits.length < 2) {
        return NextResponse.json(
          { success: false, error: "At least 2 split lines are required" },
          { status: 400 }
        )
      }

      // Fetch parent transaction
      const [parent] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, parentId),
            eq(transactions.workspaceId, context.workspaceId),
            eq(transactions.userId, context.userId)
          )
        )
        .limit(1)

      if (!parent) {
        return NextResponse.json(
          { success: false, error: "Parent transaction not found" },
          { status: 404 }
        )
      }

      const parentAmount = parseFloat(parent.amount.toString())
      const totalSplitAmount = splits.reduce((sum: number, s: any) => sum + (parseFloat(s.amount) || 0), 0)

      // Verify amounts match within 0.05 tolerance
      if (Math.abs(parentAmount - totalSplitAmount) > 0.05) {
        return NextResponse.json(
          {
            success: false,
            error: `Split sum (₹${totalSplitAmount.toFixed(2)}) must exactly equal parent transaction amount (₹${parentAmount.toFixed(2)})`,
          },
          { status: 400 }
        )
      }

      const splitGroupId = crypto.randomUUID()

      // Insert split child transactions
      const newTransactionsData = splits.map((s: any) => ({
        workspaceId: context.workspaceId,
        userId: context.userId,
        date: parent.date,
        type: parent.type,
        category: s.category.trim(),
        amount: parseFloat(s.amount).toFixed(2),
        description: s.description?.trim() || parent.description,
        paymentMethod: parent.paymentMethod,
        notes: parent.notes ? `${parent.notes} (Split from ${parent.description})` : `Split from ${parent.description}`,
        tags: ["split_transaction"],
        metadata: {
          isSplitChild: true,
          splitGroupId,
          originalParentId: parent.id,
        },
      }))

      const createdSplits = await db
        .insert(transactions)
        .values(newTransactionsData)
        .returning()

      // Delete original parent transaction
      await db
        .delete(transactions)
        .where(eq(transactions.id, parent.id))

      return NextResponse.json({
        success: true,
        message: `Transaction successfully split into ${createdSplits.length} category entries`,
        data: createdSplits,
      })
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("Batch transaction error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process batch operation" },
      { status: 500 }
    )
  }
}
