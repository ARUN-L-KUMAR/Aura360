import { NextResponse } from 'next/server'
import { getWorkspaceContext } from '@/lib/auth-helpers'
import { db, transactions } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import type { FinanceTransaction } from '@/lib/types/finance'

/**
 * Bulk Import Transactions from Excel Upload
 * POST /api/finance/excel-import
 * 
 * Accepts an array of validated transactions and inserts them into the database
 */
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()

    // Parse request body
    const body = await request.json()
    const { transactions: transactionsToImport } = body as { transactions: FinanceTransaction[] }

    if (!transactionsToImport || !Array.isArray(transactionsToImport) || transactionsToImport.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      )
    }

    // Validate and prepare transactions
    const validatedTransactions = transactionsToImport.map((transaction, index) => {
      // Validate required fields
      if (!transaction.type || !transaction.amount || !transaction.category || !transaction.date || !transaction.description) {
        throw new Error(`Transaction at index ${index} is missing required fields`)
      }

      // Validate type
      if (!['income', 'expense', 'investment'].includes(transaction.type)) {
        throw new Error(`Invalid transaction type at index ${index}: ${transaction.type}`)
      }

      // Validate amount
      if (isNaN(transaction.amount) || transaction.amount <= 0) {
        throw new Error(`Invalid amount at index ${index}: ${transaction.amount}`)
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
        throw new Error(`Invalid date format at index ${index}: ${transaction.date}`)
      }

      return {
        ...context,
        type: transaction.type as 'income' | 'expense' | 'investment',
        amount: transaction.amount.toString(),
        category: transaction.category.trim(),
        date: transaction.date,
        description: transaction.description.trim(),
        paymentMethod: (transaction.payment_method as 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other') || null,
        notes: transaction.notes || null,
      }
    })

    // Insert all transactions using Drizzle
    try {
      const inserted = await db
        .insert(transactions)
        .values(validatedTransactions)
        .returning()

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${inserted.length} transactions`,
        imported: inserted.length,
        failed: 0,
        errors: null
      })
    } catch (insertError: any) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to insert transactions', 
          details: insertError.message 
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Excel import error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to import transactions', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * Get transaction count
 * GET /api/finance/excel-import
 */
export async function GET(request: Request) {
  try {
    const context = await getWorkspaceContext()

    // Get transaction count
    const count = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId)
        )
      )

    return NextResponse.json({
      count: count[0]?.count || 0
    })

  } catch (error: any) {
    console.error('Count error:', error)
    return NextResponse.json(
      { error: 'Failed to get count', details: error.message },
      { status: 500 }
    )
  }
}
