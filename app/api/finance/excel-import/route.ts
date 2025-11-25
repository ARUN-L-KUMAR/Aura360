import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FinanceTransaction } from '@/lib/types/finance'

/**
 * Bulk Import Transactions from Excel Upload
 * POST /api/finance/excel-import
 * 
 * Accepts an array of validated transactions and inserts them into Supabase
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { transactions } = body as { transactions: FinanceTransaction[] }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      )
    }

    // Validate and prepare transactions
    const transactionsToInsert = transactions.map((transaction, index) => {
      // Validate required fields
      if (!transaction.type || !transaction.amount || !transaction.category || !transaction.date || !transaction.description) {
        throw new Error(`Transaction at index ${index} is missing required fields`)
      }

      // Validate type
      if (!['income', 'expense', 'investment', 'transfer'].includes(transaction.type)) {
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
        user_id: user.id,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category.trim(),
        date: transaction.date,
        description: transaction.description.trim(),
        payment_method: transaction.payment_method || null,
        notes: transaction.notes || null,
        needs_review: false
      }
    })

    // Batch insert for better performance
    const BATCH_SIZE = 100
    const batches = []
    for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
      batches.push(transactionsToInsert.slice(i, i + BATCH_SIZE))
    }

    let successCount = 0
    let failedCount = 0
    const errors: Array<{ row: number; error: string }> = []

    // Insert each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`Inserting batch ${i + 1}/${batches.length} (${batch.length} records)...`)

      const { data, error } = await supabase
        .from('transactions')
        .insert(batch)
        .select()

      if (error) {
        console.error(`Error in batch ${i + 1}:`, error)
        failedCount += batch.length
        errors.push({
          row: i * BATCH_SIZE,
          error: error.message
        })
      } else {
        successCount += data?.length || 0
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${successCount} transactions${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      imported: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : null
    })

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
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get transaction count
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to get transaction count', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: count || 0
    })

  } catch (error: any) {
    console.error('Count error:', error)
    return NextResponse.json(
      { error: 'Failed to get count', details: error.message },
      { status: 500 }
    )
  }
}
