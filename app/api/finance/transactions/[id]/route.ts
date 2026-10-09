import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { auditUpdate, auditDelete } from "@/lib/audit"

// Only these fields may be changed through the API. Never spread the raw body into the update:
// that would let a client overwrite userId / workspaceId / id.
const EDITABLE_FIELDS = ["date", "type", "category", "amount", "description", "paymentMethod", "notes", "needsReview", "tags", "attachments", "metadata"] as const

function pickTransactionUpdates(body: Record<string, any>) {
  const updates: Record<string, any> = {}
  for (const field of EDITABLE_FIELDS) {
    if (body?.[field] !== undefined) updates[field] = body[field]
  }
  if (updates.amount !== undefined) updates.amount = Number(updates.amount).toFixed(2)
  if ("description" in updates && !String(updates.description ?? "").trim()) updates.description = "No description"
  return updates
}

// DELETE /api/finance/transactions/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getWorkspaceContext()
    const { id } = await params

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getWorkspaceContext()
    const { id } = await params
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
        ...pickTransactionUpdates(body),
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
