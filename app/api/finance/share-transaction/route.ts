import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Share Transaction API Route
 * Handles incoming shared transactions from UPI/GPay apps
 * 
 * POST /api/finance/share-transaction
 * Body: { amount, date, description, category?, payment_method? }
 */

interface ShareTransactionBody {
  amount: number | string
  date?: string
  description?: string
  category?: string
  payment_method?: string
}

// Common expense categories for auto-detection
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food': ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'hotel', 'biryani', 'pizza', 'burger', 'dominos', 'mcdonalds', 'kfc'],
  'Transport': ['uber', 'ola', 'rapido', 'metro', 'bus', 'fuel', 'petrol', 'diesel', 'parking'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'mall', 'store', 'shop'],
  'Bills': ['electricity', 'water', 'gas', 'broadband', 'wifi', 'internet', 'mobile', 'recharge', 'dth', 'jio', 'airtel', 'vi'],
  'Entertainment': ['netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'movie', 'theatre', 'game'],
  'Health': ['pharmacy', 'medical', 'hospital', 'doctor', 'apollo', 'medicine', 'lab', 'clinic'],
  'Groceries': ['bigbasket', 'blinkit', 'zepto', 'instamart', 'grocery', 'vegetables', 'fruits', 'dmart'],
  'Education': ['course', 'book', 'udemy', 'coursera', 'school', 'college', 'fees', 'tuition'],
}

/**
 * Auto-detect category based on description keywords
 */
function detectCategory(description: string): string {
  const lowerDesc = description.toLowerCase()
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category
    }
  }
  
  return 'Other' // Default category
}

/**
 * Parse amount from string (handles formats like "₹1,234.56", "Rs 1234", etc.)
 */
function parseAmount(amountStr: string | number): number | null {
  if (typeof amountStr === 'number') {
    return amountStr > 0 ? amountStr : null
  }
  
  // Remove currency symbols and commas
  const cleaned = amountStr
    .replace(/[₹$€£Rs.INR\s,]/gi, '')
    .trim()
  
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) || parsed <= 0 ? null : parsed
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0]
  }
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0]
    }
    return date.toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Extract transaction details from shared text
 * Parses common UPI/GPay share formats
 */
function parseSharedText(text: string): Partial<ShareTransactionBody> {
  const result: Partial<ShareTransactionBody> = {}
  
  // Try to extract amount (common patterns)
  const amountPatterns = [
    /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:paid|sent|received|amount[:\s]*)\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:₹|Rs\.?|INR)/i,
  ]
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseAmount(match[1])
      if (amount) {
        result.amount = amount
        break
      }
    }
  }
  
  // Try to extract date
  const datePatterns = [
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      result.date = parseDate(match[1])
      break
    }
  }
  
  // Use full text as description (cleaned up)
  result.description = text.substring(0, 200).trim()
  
  // Detect payment method from text
  if (/google\s*pay|gpay/i.test(text)) {
    result.payment_method = 'upi'
  } else if (/phone\s*pe|phonepe/i.test(text)) {
    result.payment_method = 'upi'
  } else if (/paytm/i.test(text)) {
    result.payment_method = 'wallet'
  } else if (/upi/i.test(text)) {
    result.payment_method = 'upi'
  }
  
  return result
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to add transactions.' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: ShareTransactionBody & { text?: string; title?: string }
    
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // If text is provided (from share intent), parse it
    let parsedData: Partial<ShareTransactionBody> = {}
    if (body.text || body.title) {
      const textToParse = [body.title, body.text].filter(Boolean).join(' ')
      parsedData = parseSharedText(textToParse)
    }

    // Merge parsed data with explicit body data (explicit takes priority)
    const amount = parseAmount(body.amount ?? parsedData.amount ?? 0)
    const date = parseDate(body.date ?? parsedData.date)
    const description = body.description ?? parsedData.description ?? ''
    const category = body.category ?? (description ? detectCategory(description) : 'Other')
    const payment_method = body.payment_method ?? parsedData.payment_method ?? 'upi'

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Please provide a positive number.' },
        { status: 400 }
      )
    }

    // Insert transaction
    const { data: transaction, error: insertError } = await supabase
      .from('finances')
      .insert({
        user_id: user.id,
        type: 'expense',
        amount,
        category,
        description: description || null,
        payment_method,
        date,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting shared transaction:', insertError)
      return NextResponse.json(
        { error: 'Failed to save transaction. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction added successfully',
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

/**
 * GET /api/finance/share-transaction
 * Returns parsed data from query params (for share intent redirect)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const text = searchParams.get('text') || ''
  const title = searchParams.get('title') || ''
  
  // Parse the shared text
  const textToParse = [title, text].filter(Boolean).join(' ')
  const parsed = parseSharedText(textToParse)
  
  // Auto-detect category if description exists
  if (parsed.description) {
    parsed.category = detectCategory(parsed.description)
  }
  
  return NextResponse.json({
    amount: parsed.amount || null,
    date: parsed.date || new Date().toISOString().split('T')[0],
    description: parsed.description || '',
    category: parsed.category || 'Other',
    payment_method: parsed.payment_method || 'upi',
    raw_text: textToParse,
  })
}
