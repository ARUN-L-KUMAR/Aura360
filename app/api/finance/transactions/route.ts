/**
 * Example Finance API Route with New Architecture
 * 
 * Demonstrates:
 * - Workspace scoping
 * - Audit logging
 * - Type-safe Drizzle queries
 */

import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { type PaymentMethod, type TransactionType } from "@/lib/services/wallet"
import { auditCreate } from "@/lib/audit"

// GET /api/finance/transactions
export async function GET(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    
    const limit = Math.min(parseInt(searchParams.get("limit") || "10000"), 10000)
    const offset = parseInt(searchParams.get("offset") || "0")
    const type = searchParams.get("type") as TransactionType | null

    // Workspace-scoped query
    let query = db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId),
          type ? eq(transactions.type, type) : undefined
        )
      )
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset)

    const data = await query

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        limit,
        offset,
        total: data.length,
      },
    })
  } catch (error) {
    console.error("[Finance API Error]", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}

// POST /api/finance/transactions
export async function POST(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()

    const {
      date,
      type,
      category,
      amount,
      description,
      paymentMethod,
      notes,
    } = body

    // Validate required fields
    if (!date || !type || !category || !amount) {
      console.error("[Finance API] Validation failed:", { date, type, category, amount, body })
      return NextResponse.json(
        { success: false, error: "Missing required fields: date, type, category, amount", received: { date, type, category, amount } },
        { status: 400 }
      )
    }

    // Insert transaction
    const [transaction] = await db
      .insert(transactions)
      .values({
        ...context,
        date: date, // date field is string type
        type,
        category,
        amount: amount.toString(),
        description: description || "No description",
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      })
      .returning()

    // Audit log
    await auditCreate(
      context,
      "transactions",
      transaction.id,
      transaction,
      {
        source: "api",
        method: "POST",
      }
    )

    return NextResponse.json({
      success: true,
      data: transaction,
      message: "Transaction created successfully",
    })
  } catch (error) {
    console.error("[Finance API Error]", error)
    return NextResponse.json(
      { success: false, error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}
