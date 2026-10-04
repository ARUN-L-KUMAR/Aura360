import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions, walletLedger, walletBalances } from "@/lib/db"
import { getCurrentBalance } from "@/lib/services/wallet"
import { type PaymentMethod } from "@/lib/services/wallet"

// POST /api/finance/transfers
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const {
      fromMethod,
      toMethod,
      amount,
      date = new Date().toISOString().split("T")[0],
      description,
      notes,
    } = body

    if (!fromMethod || !toMethod) {
      return NextResponse.json(
        { success: false, error: "Both source (from) and destination (to) accounts are required" },
        { status: 400 }
      )
    }

    if (fromMethod === toMethod) {
      return NextResponse.json(
        { success: false, error: "Source and destination accounts must be different" },
        { status: 400 }
      )
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Transfer amount must be a positive number" },
        { status: 400 }
      )
    }

    const desc =
      description?.trim() ||
      `Transfer: ${formatPaymentName(fromMethod)} ➔ ${formatPaymentName(toMethod)}`

    // 1. Insert into transactions table
    const [transferTx] = await db
      .insert(transactions)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        date,
        type: "transfer",
        category: "Transfer",
        amount: numericAmount.toFixed(2),
        description: desc,
        paymentMethod: fromMethod,
        notes: notes?.trim() || null,
        tags: ["internal_transfer"],
        metadata: {
          fromMethod,
          toMethod,
          isInternalTransfer: true,
        },
      })
      .returning()

    // 2. Adjust wallet ledger & balances
    try {
      // From Account (Deduct)
      const fromBal = await getCurrentBalance(context, fromMethod as PaymentMethod)
      const newFromBal = fromBal - numericAmount

      await db.insert(walletLedger).values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        transactionId: transferTx.id,
        amount: numericAmount.toFixed(2),
        type: "transfer",
        paymentMethod: fromMethod as PaymentMethod,
        category: "Transfer",
        description: `Transfer Out: ➔ ${formatPaymentName(toMethod)}`,
        balanceAfter: newFromBal.toFixed(2),
      })

      await db
        .insert(walletBalances)
        .values({
          workspaceId: context.workspaceId,
          userId: context.userId,
          paymentMethod: fromMethod as PaymentMethod,
          currentBalance: newFromBal.toFixed(2),
          lastRecalculatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            walletBalances.workspaceId,
            walletBalances.userId,
            walletBalances.paymentMethod,
          ],
          set: {
            currentBalance: newFromBal.toFixed(2),
            lastRecalculatedAt: new Date(),
            updatedAt: new Date(),
          },
        })

      // To Account (Add)
      const toBal = await getCurrentBalance(context, toMethod as PaymentMethod)
      const newToBal = toBal + numericAmount

      await db.insert(walletLedger).values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        transactionId: transferTx.id,
        amount: numericAmount.toFixed(2),
        type: "transfer",
        paymentMethod: toMethod as PaymentMethod,
        category: "Transfer",
        description: `Transfer In: ⬅ ${formatPaymentName(fromMethod)}`,
        balanceAfter: newToBal.toFixed(2),
      })

      await db
        .insert(walletBalances)
        .values({
          workspaceId: context.workspaceId,
          userId: context.userId,
          paymentMethod: toMethod as PaymentMethod,
          currentBalance: newToBal.toFixed(2),
          lastRecalculatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            walletBalances.workspaceId,
            walletBalances.userId,
            walletBalances.paymentMethod,
          ],
          set: {
            currentBalance: newToBal.toFixed(2),
            lastRecalculatedAt: new Date(),
            updatedAt: new Date(),
          },
        })
    } catch (ledgerError) {
      console.warn("Wallet ledger adjustment skipped:", ledgerError)
    }

    return NextResponse.json({
      success: true,
      data: transferTx,
      message: `Transferred ₹${numericAmount.toLocaleString("en-IN")} from ${formatPaymentName(
        fromMethod
      )} to ${formatPaymentName(toMethod)}`,
    })
  } catch (error: any) {
    console.error("Transfer error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process internal transfer" },
      { status: 500 }
    )
  }
}

function formatPaymentName(name: string): string {
  switch (name) {
    case "upi":
      return "UPI"
    case "card":
      return "Card"
    case "cash":
      return "Cash"
    case "bank_transfer":
      return "Bank"
    default:
      return name
  }
}
