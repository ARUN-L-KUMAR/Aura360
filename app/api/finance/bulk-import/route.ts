import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import supabaseData from '@/public/supabase_insert.json'

/**
 * Bulk Import Finance Data API Route
 * POST /api/finance/bulk-import
 * 
 * This endpoint imports all transactions from your CSV data
 * into the Supabase database.
 * 
 * IMPORTANT: This should only be run once to import historical data!
 * After import, use the regular transaction APIs for new entries.
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

    // Optional: Check if data already exists to prevent duplicate imports
    const { data: existingData, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing data:', checkError)
    }

    if (existingData && existingData.length > 0) {
      // Uncomment this if you want to prevent duplicate imports
      // return NextResponse.json(
      //   { error: 'Data already imported. Delete existing data first if you want to re-import.' },
      //   { status: 400 }
      // )
    }

    // Update user_id to current authenticated user
    const transactionsToInsert = supabaseData.map(transaction => ({
      ...transaction,
      user_id: user.id,
      // Optionally add payment_method and notes if they exist in your data
      payment_method: null,
      notes: null,
      needs_review: false
    }))

    // Supabase has a limit on bulk inserts, so we'll batch them
    const BATCH_SIZE = 100
    const batches = []
    for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
      batches.push(transactionsToInsert.slice(i, i + BATCH_SIZE))
    }

    let successCount = 0
    let failedCount = 0
    const errors = []

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`Importing batch ${i + 1}/${batches.length} (${batch.length} records)...`)

      const { data, error } = await supabase
        .from('transactions')
        .insert(batch)
        .select()

      if (error) {
        console.error(`Error in batch ${i + 1}:`, error)
        failedCount += batch.length
        errors.push({
          batch: i + 1,
          error: error.message
        })
      } else {
        successCount += data?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${successCount} transactions imported, ${failedCount} failed.`,
      stats: {
        total: transactionsToInsert.length,
        successful: successCount,
        failed: failedCount,
        batches: batches.length
      },
      errors: errors.length > 0 ? errors : null
    })

  } catch (error: any) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Failed to import data', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get import status
 * GET /api/finance/bulk-import
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

    // Check current transaction count
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to check import status', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      imported: count || 0,
      total: supabaseData.length,
      isComplete: count === supabaseData.length,
      canImport: count === 0
    })

  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Delete all transactions (use with caution!)
 * DELETE /api/finance/bulk-import
 */
export async function DELETE(request: Request) {
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

    // Delete all transactions for current user
    const { error, count } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
      .select()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete transactions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Deleted all transactions`,
      deletedCount: count || 0
    })

  } catch (error: any) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete data', details: error.message },
      { status: 500 }
    )
  }
}
