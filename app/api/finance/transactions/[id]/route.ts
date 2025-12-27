import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { auditUpdate, auditDelete } from "@/lib/audit"

// DELETE /api/finance/transactions/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getWorkspaceContext()
    const { id } = params

    // Verify transaction exists and belongs to user
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId)
        )
      )

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Delete transaction
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId)
        )
      )

    // Audit log
    await auditDelete(context, "transactions", id, transaction, {
      source: "api",
      method: "DELETE",
    })

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    })
  } catch (error) {
    console.error("[Finance API Error]", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}

// PATCH /api/finance/transactions/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getWorkspaceContext()
    const { id } = params
    const body = await request.json()

    // Verify transaction exists and belongs to user
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId)
        )
      )

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Update transaction
    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId)
        )
      )
      .returning()

    // Audit log
    await auditUpdate(
      context,
      "transactions",
      id,
      existingTransaction,
      updatedTransaction,
      {
        source: "api",
        method: "PATCH",
      }
    )

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
      message: "Transaction updated successfully",
    })
  } catch (error) {
    console.error("[Finance API Error]", error)
    return NextResponse.json(
      { success: false, error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}
