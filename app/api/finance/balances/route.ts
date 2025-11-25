import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Balance Management API Routes
 * Handles fetching, creating, and updating user balance data
 */

/**
 * GET /api/finance/balances
 * Fetch the latest balance data for the authenticated user
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch latest balance record
    const { data: balances, error: balanceError } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (balanceError) {
      // Check if error is because table doesn't exist (PGRST116)
      if (balanceError.code === 'PGRST116' || balanceError.message?.includes('does not exist')) {
        console.warn('⚠️ Balances table does not exist yet. Please run migration: scripts/create-balances-table.sql')
      } else {
        console.error('Error fetching balances:', balanceError)
      }
      // Continue with null balances instead of erroring out
    }

    // Fetch transaction totals for expected balance
    const { data: totals, error: totalsError } = await supabase
      .from('finances')
      .select('type, amount')
      .eq('user_id', user.id)

    if (totalsError && totalsError.code !== 'PGRST116') {
      // PGRST116 = relation not found, which is fine if table is empty
      console.error('Error fetching finance totals:', totalsError)
    }

    // Calculate expected balance (Income - Expenses ONLY, not investments)
    const totalIncome = totals
      ?.filter((t: any) => t.type === 'income')
      .reduce((sum, t: any) => sum + Number(t.amount), 0) || 0

    const totalExpense = totals
      ?.filter((t: any) => t.type === 'expense')
      .reduce((sum, t: any) => sum + Number(t.amount), 0) || 0

    const totalInvestment = totals
      ?.filter((t: any) => t.type === 'investment')
      .reduce((sum, t: any) => sum + Number(t.amount), 0) || 0

    // Get balance data or return defaults if none exist
    const balanceData = balances && balances.length > 0 
      ? balances[0]
      : null

    const cashBalance = balanceData?.cash_balance || 0
    const accountBalance = balanceData?.account_balance || 0
    const realBalance = Number(cashBalance) + Number(accountBalance)

    return NextResponse.json({
      success: true,
      data: {
        id: balanceData?.id || null,
        cash_balance: cashBalance,
        account_balance: accountBalance,
        real_balance: realBalance,
        updated_at: balanceData?.updated_at || null,
      },
      totals: {
        total_income: totalIncome,
        total_expense: totalExpense,
      },
    })
  } catch (error: any) {
    console.error('Balance fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balances', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/balances
 * Create initial balance record for a user
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cash_balance = 0, account_balance = 0 } = await request.json()

    // Validate inputs
    if (
      typeof cash_balance !== 'number' ||
      typeof account_balance !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid input: cash_balance and account_balance must be numbers' },
        { status: 400 }
      )
    }

    // Insert new balance record
    const { data, error } = await supabase
      .from('balances')
      .insert({
        user_id: user.id,
        cash_balance,
        account_balance,
      })
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.error('❌ Balances table does not exist. Please run: scripts/create-balances-table.sql')
        return NextResponse.json(
          { 
            error: 'Balances table not initialized',
            hint: 'Please run scripts/create-balances-table.sql in Supabase SQL Editor',
            details: error.message 
          },
          { status: 503 }
        )
      }
      console.error('Error creating balance:', error)
      return NextResponse.json(
        { error: 'Failed to create balance record', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Balance record created',
        data: data,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Balance creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create balance', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/balances
 * Update (upsert) balance record for the user
 * Will update existing record or create new one if none exists
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cash_balance, account_balance } = await request.json()

    // Validate inputs
    if (
      typeof cash_balance !== 'number' ||
      typeof account_balance !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid input: cash_balance and account_balance must be numbers' },
        { status: 400 }
      )
    }

    // Check if balance record exists for this user
    const { data: existingBalances, error: existingError } = await supabase
      .from('balances')
      .select('id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)

    // Handle table not existing
    if (existingError && (existingError.code === 'PGRST116' || existingError.message?.includes('does not exist'))) {
      console.error('❌ Balances table does not exist. Please run: scripts/create-balances-table.sql')
      return NextResponse.json(
        { 
          error: 'Balances table not initialized',
          hint: 'Please run scripts/create-balances-table.sql in Supabase SQL Editor',
          details: existingError.message 
        },
        { status: 503 }
      )
    }

    let result
    let isUpdate = false

    if (existingBalances && existingBalances.length > 0) {
      // Update existing record
      const { data, error } = await supabase
        .from('balances')
        .update({
          cash_balance,
          account_balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBalances[0].id)
        .select()
        .single()

      if (error) {
        console.error('Error updating balance:', error)
        return NextResponse.json(
          { error: 'Failed to update balance', details: error.message },
          { status: 500 }
        )
      }

      result = data
      isUpdate = true
    } else {
      // Create new record if none exists
      const { data, error } = await supabase
        .from('balances')
        .insert({
          user_id: user.id,
          cash_balance,
          account_balance,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating balance:', error)
        return NextResponse.json(
          { error: 'Failed to create balance', details: error.message },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Balance updated' : 'Balance created',
      data: result,
    })
  } catch (error: any) {
    console.error('Balance upsert error:', error)
    return NextResponse.json(
      { error: 'Failed to update balance', details: error.message },
      { status: 500 }
    )
  }
}
