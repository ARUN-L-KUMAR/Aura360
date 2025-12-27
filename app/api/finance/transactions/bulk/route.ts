/**
 * Bulk Transaction Import API
 * Optimized for fast batch imports from Excel/CSV
 */

import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions } from "@/lib/db"
import { type PaymentMethod } from "@/lib/services/wallet"

interface BulkTransaction {
  date: string
  type: "income" | "expense" | "investment"
  category: string
  amount: number
  description: string
  paymentMethod?: PaymentMethod | null
  notes?: string | null
}

export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const { transactions: transactionList } = body as { transactions: BulkTransaction[] }

    console.log('📦 [BULK IMPORT] Starting bulk import:', {
      totalTransactions: transactionList?.length,
      user: context.userId,
      workspace: context.workspaceId
    })

    if (!Array.isArray(transactionList) || transactionList.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or empty transaction list" },
        { status: 400 }
      )
    }

    const results = {
      total: transactionList.length,
      succeeded: 0,
      failed: 0,
      errors: [] as any[]
    }

    // Process in batches of 50 for optimal performance
    const batchSize = 50
    for (let i = 0; i < transactionList.length; i += batchSize) {
      const batch = transactionList.slice(i, i + batchSize)
      
      try {
        // Bulk insert transactions
        const transactionValues = batch.map(t => ({
          ...context,
          date: t.date,
          type: t.type,
          category: t.category,
          amount: t.amount.toString(),
          description: t.description?.trim() || "No description",
          paymentMethod: t.paymentMethod || null,
          notes: t.notes || null,
          needsReview: false,
        }))

        const insertedTransactions = await db
          .insert(transactions)
          .values(transactionValues)
          .returning()

        results.succeeded += batch.length
      } catch (error) {
        console.error(`[Bulk Import] Batch ${i / batchSize + 1} failed:`, error)
        results.failed += batch.length
        results.errors.push({
          batch: i / batchSize + 1,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    }

    console.log('✅ [BULK IMPORT] Completed:', results)

    return NextResponse.json({
      success: results.failed === 0,
      data: results,
      message: `Imported ${results.succeeded}/${results.total} transactions successfully`,
    })
  } catch (error) {
    console.error("[Bulk Import Error]", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to import transactions" },
      { status: 500 }
    )
  }
}
