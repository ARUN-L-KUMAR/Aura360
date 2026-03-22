import { NextResponse } from 'next/server'
import { getWorkspaceContext } from '@/lib/auth-helpers'
import { db, transactions } from '@/lib/db'
import { parseTransactionText } from '@/lib/services/gemini-transaction-parser'

/**
 * Share Transaction API Route
 * Handles incoming shared transactions from UPI/GPay/bank apps.
 * Uses Gemini for parsing (falls back to regex if key not set).
 *
 * GET  /api/finance/share-transaction?text=...&title=... → parsed preview JSON
 * POST /api/finance/share-transaction                    → save transaction
 */

// ─── GET: parse & return preview (no DB write) ─────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const text  = searchParams.get('text')  || ''
  const title = searchParams.get('title') || ''
  const combined = [title, text].filter(Boolean).join('\n')

  if (!combined.trim()) {
    return NextResponse.json(
      { error: 'No text provided' },
      { status: 400 }
    )
  }

  const parsed = await parseTransactionText(combined)

  return NextResponse.json({
    amount:         parsed.amount,
    date:           parsed.date,
    time:           parsed.time,
    description:    parsed.description,
    category:       parsed.category,
    payment_method: parsed.payment_method,
    receiver:       parsed.receiver,
    transaction_id: parsed.transaction_id,
    type:           parsed.type,
    raw_text:       combined,
    parsed_by:      parsed.parsed_by,
  })
}

// ─── POST: save transaction ─────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()

    let body: {
      amount?: number | string
      date?: string
      description?: string
      category?: string
      payment_method?: string
      receiver?: string
      transaction_id?: string
      type?: string
      text?: string
      title?: string
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // If raw text provided (from share intent), parse it first
    let parsed = body.text || body.title
      ? await parseTransactionText([body.title, body.text].filter(Boolean).join('\n'))
      : null

    // Explicit body fields override parsed values
    const amountRaw = body.amount ?? parsed?.amount
    const amount = typeof amountRaw === 'number'
      ? amountRaw
      : amountRaw
        ? parseFloat(String(amountRaw).replace(/[^\d.]/g, ''))
        : null

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Please provide a positive number.' },
        { status: 400 }
      )
    }

    const date           = body.date           ?? parsed?.date           ?? new Date().toISOString().split('T')[0]
    const description    = body.description    ?? parsed?.description    ?? ''
    const category       = body.category       ?? parsed?.category       ?? 'Other'
    const rawMethod      = body.payment_method ?? parsed?.payment_method ?? 'upi'
    const payment_method = (rawMethod === 'wallet' ? 'other' : rawMethod) as
      'cash' | 'card' | 'upi' | 'bank_transfer' | 'other'
    const txType         = (body.type          ?? parsed?.type           ?? 'expense') as 'expense' | 'income'

    const [transaction] = await db
      .insert(transactions)
      .values({
        ...context,
        type:          txType,
        amount:        amount.toString(),
        category,
        description:   description || `Payment via ${payment_method.toUpperCase()}`,
        paymentMethod: payment_method,
        date,
      })
      .returning()

    if (!transaction) {
      return NextResponse.json(
        { error: 'Failed to save transaction. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success:     true,
      message:     'Transaction added successfully',
      transaction,
    })
  } catch (error) {
    console.error('Share transaction error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
