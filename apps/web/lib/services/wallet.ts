/**
 * Wallet Ledger Service - Immutable Pattern
 * 
 * Core Principles:
 * 1. Ledger entries are NEVER updated or deleted
 * 2. Balances are ALWAYS derived from ledger
 * 3. Every transaction creates a ledger entry
 * 4. Balance after is calculated and stored for quick access
 */

import { db, walletLedger, walletBalances, type WorkspaceContext } from "@/lib/db"
import { eq, and, desc, sum, sql } from "drizzle-orm"
import { dbTransaction } from "@/lib/db"

export type PaymentMethod = "cash" | "card" | "upi" | "bank_transfer" | "other"
export type TransactionType = "income" | "expense" | "investment" | "transfer"

export type LedgerEntry = {
  workspaceId: string
  userId: string
  transactionId?: string
  amount: string
  type: TransactionType
  paymentMethod: PaymentMethod
  category?: string
  description: string
  metadata?: Record<string, any>
}

/**
 * Add entry to wallet ledger (IMMUTABLE)
 * This is the ONLY way to modify wallet state
 */
export async function addLedgerEntry(entry: LedgerEntry) {
  return dbTransaction(async (tx) => {
    // Get current balance for this payment method
    const currentBalance = await getCurrentBalance(
      {
        workspaceId: entry.workspaceId,
        userId: entry.userId,
      },
      entry.paymentMethod
    )

    // Calculate new balance
    const amount = parseFloat(entry.amount)
    let balanceAfter = currentBalance

    if (entry.type === "income") {
      balanceAfter += amount
    } else if (entry.type === "expense") {
      balanceAfter -= amount
    } else if (entry.type === "investment") {
      balanceAfter -= amount // Investment reduces liquid balance
    }

    // Insert ledger entry with calculated balance
    const [ledgerRecord] = await tx
      .insert(walletLedger)
      .values({
        ...entry,
        description: entry.description?.trim() || "No description",
        balanceAfter: balanceAfter.toFixed(2),
      })
      .returning()

    // Update or insert balance snapshot (for quick access)
    await tx
      .insert(walletBalances)
      .values({
        workspaceId: entry.workspaceId,
        userId: entry.userId,
        paymentMethod: entry.paymentMethod,
        currentBalance: balanceAfter.toFixed(2),
        lastRecalculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          walletBalances.workspaceId,
          walletBalances.userId,
          walletBalances.paymentMethod,
        ],
        set: {
          currentBalance: balanceAfter.toFixed(2),
          lastRecalculatedAt: new Date(),
          updatedAt: new Date(),
        },
      })

    return ledgerRecord
  })
}

/**
 * Get current balance for a payment method
 * Always derived from ledger, never from cache unless recent
 */
export async function getCurrentBalance(
  context: WorkspaceContext,
  paymentMethod: PaymentMethod
): Promise<number> {
  // Try to get from balance snapshot first (fast path)
  const [balanceSnapshot] = await db
    .select()
    .from(walletBalances)
    .where(
      and(
        eq(walletBalances.workspaceId, context.workspaceId),
        eq(walletBalances.userId, context.userId),
        eq(walletBalances.paymentMethod, paymentMethod)
      )
    )
    .limit(1)

  if (balanceSnapshot) {
    // Check if snapshot is recent (within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (balanceSnapshot.lastRecalculatedAt > fiveMinutesAgo) {
      return parseFloat(balanceSnapshot.currentBalance)
    }
  }

  // Recalculate from ledger (slow path but accurate)
  return recalculateBalance(context, paymentMethod)
}

/**
 * Recalculate balance from ledger entries
 * This is the source of truth
 */
export async function recalculateBalance(
  context: WorkspaceContext,
  paymentMethod: PaymentMethod
): Promise<number> {
  // Get latest ledger entry for this payment method
  const [latestEntry] = await db
    .select()
    .from(walletLedger)
    .where(
      and(
        eq(walletLedger.workspaceId, context.workspaceId),
        eq(walletLedger.userId, context.userId),
        eq(walletLedger.paymentMethod, paymentMethod)
      )
    )
    .orderBy(desc(walletLedger.createdAt))
    .limit(1)

  if (!latestEntry) {
    return 0
  }

  const balance = parseFloat(latestEntry.balanceAfter)

  // Update balance snapshot
  await db
    .insert(walletBalances)
    .values({
      workspaceId: context.workspaceId,
      userId: context.userId,
      paymentMethod,
      currentBalance: balance.toFixed(2),
      lastRecalculatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        walletBalances.workspaceId,
        walletBalances.userId,
        walletBalances.paymentMethod,
      ],
      set: {
        currentBalance: balance.toFixed(2),
        lastRecalculatedAt: new Date(),
        updatedAt: new Date(),
      },
    })

  return balance
}

/**
 * Get all balances for a user across all payment methods
 */
export async function getAllBalances(context: WorkspaceContext) {
  const paymentMethods: PaymentMethod[] = ["cash", "card", "upi", "bank_transfer", "other"]
  
  const balances = await Promise.all(
    paymentMethods.map(async (method) => {
      const balance = await getCurrentBalance(context, method)
      return {
        paymentMethod: method,
        balance,
      }
    })
  )

  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0)

  return {
    balances,
    totalBalance,
  }
}

/**
 * Get ledger history with pagination
 */
export async function getLedgerHistory(
  context: WorkspaceContext,
  options: {
    paymentMethod?: PaymentMethod
    limit?: number
    offset?: number
  } = {}
) {
  const { paymentMethod, limit = 50, offset = 0 } = options

  let query = db
    .select()
    .from(walletLedger)
    .where(
      and(
        eq(walletLedger.workspaceId, context.workspaceId),
        eq(walletLedger.userId, context.userId),
        paymentMethod ? eq(walletLedger.paymentMethod, paymentMethod) : undefined
      )
    )
    .orderBy(desc(walletLedger.createdAt))
    .limit(limit)
    .offset(offset)

  const entries = await query

  return entries
}

/**
 * Verify ledger integrity (admin/debug tool)
 * Recalculates all balances from scratch
 */
export async function verifyLedgerIntegrity(
  context: WorkspaceContext,
  paymentMethod: PaymentMethod
): Promise<{
  isValid: boolean
  calculatedBalance: number
  storedBalance: number
  discrepancy: number
}> {
  // Get all ledger entries in order
  const entries = await db
    .select()
    .from(walletLedger)
    .where(
      and(
        eq(walletLedger.workspaceId, context.workspaceId),
        eq(walletLedger.userId, context.userId),
        eq(walletLedger.paymentMethod, paymentMethod)
      )
    )
    .orderBy(walletLedger.createdAt)

  // Recalculate balance step by step
  let calculatedBalance = 0
  for (const entry of entries) {
    const amount = parseFloat(entry.amount)
    if (entry.type === "income") {
      calculatedBalance += amount
    } else if (entry.type === "expense" || entry.type === "investment") {
      calculatedBalance -= amount
    }
  }

  // Get stored balance
  const storedBalance = await getCurrentBalance(context, paymentMethod)

  const discrepancy = Math.abs(calculatedBalance - storedBalance)
  const isValid = discrepancy < 0.01 // Allow 1 cent difference for rounding

  return {
    isValid,
    calculatedBalance,
    storedBalance,
    discrepancy,
  }
}

/**
 * Transfer between payment methods
 * Creates two ledger entries (expense from source, income to destination)
 */
export async function transferBetweenMethods(
  context: WorkspaceContext,
  amount: string,
  fromMethod: PaymentMethod,
  toMethod: PaymentMethod,
  description: string
) {
  return dbTransaction(async (tx) => {
    // Deduct from source
    await addLedgerEntry({
      ...context,
      amount,
      type: "transfer",
      paymentMethod: fromMethod,
      category: "transfer_out",
      description: `Transfer to ${toMethod}: ${description}`,
      metadata: {
        transferTo: toMethod,
        transferType: "outgoing",
      },
    })

    // Add to destination
    await addLedgerEntry({
      ...context,
      amount,
      type: "income",
      paymentMethod: toMethod,
      category: "transfer_in",
      description: `Transfer from ${fromMethod}: ${description}`,
      metadata: {
        transferFrom: fromMethod,
        transferType: "incoming",
      },
    })

    return {
      success: true,
      message: `Transferred ${amount} from ${fromMethod} to ${toMethod}`,
    }
  })
}
