import { NextResponse } from 'next/server'

/**
 * Bulk Import Finance Data API Route
 * POST /api/finance/bulk-import
 * 
 * DEPRECATED: Use /api/finance/excel-import or /api/finance/transactions instead
 */

export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/finance/excel-import for bulk imports or /api/finance/transactions for single transactions.' },
    { status: 410 }
  )
}

