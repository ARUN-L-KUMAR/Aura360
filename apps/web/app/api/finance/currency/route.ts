import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, workspaces } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getExchangeRates, convertCurrency, CURRENCY_SYMBOLS } from "@/lib/services/currency"

// GET /api/finance/currency - Fetch workspace base currency and current exchange rates
export async function GET() {
  try {
    const context = await getWorkspaceContext()

    const [ws] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        settings: workspaces.settings,
      })
      .from(workspaces)
      .where(eq(workspaces.id, context.workspaceId))
      .limit(1)

    const baseCurrency = ws?.settings?.currency || "INR"
    const rates = await getExchangeRates()

    return NextResponse.json({
      success: true,
      baseCurrency,
      symbols: CURRENCY_SYMBOLS,
      rates,
    })
  } catch (error: any) {
    console.error("[GET /api/finance/currency error]:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch currency rates" },
      { status: 500 }
    )
  }
}

// POST /api/finance/currency - Convert amounts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, from, to } = body

    if (amount === undefined || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, error: "Valid amount is required" },
        { status: 400 }
      )
    }

    const converted = await convertCurrency(
      Number(amount),
      from || "USD",
      to || "INR"
    )

    return NextResponse.json({
      success: true,
      original: { amount: Number(amount), currency: from },
      converted: { amount: converted, currency: to },
    })
  } catch (error: any) {
    console.error("[POST /api/finance/currency error]:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to convert currency" },
      { status: 500 }
    )
  }
}

