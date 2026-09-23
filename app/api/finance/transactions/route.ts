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
import { eq, and, desc, sql, count, or, ilike } from "drizzle-orm"
import { type PaymentMethod, type TransactionType } from "@/lib/services/wallet"
import { auditCreate } from "@/lib/audit"

// GET /api/finance/transactions
export async function GET(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const { searchParams } = new URL(request.url)
    
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")
    const typeParam = searchParams.get("type") as TransactionType | null
    const search = searchParams.get("search")?.trim()
    const category = searchParams.get("category")
    const month = searchParams.get("month")

    // Default limit: if limit is specified, use it; if page is given without limit, default to 10; otherwise 10000 for compatibility
    const limit = limitParam 
      ? Math.min(Math.max(1, parseInt(limitParam)), 10000) 
      : (pageParam ? 10 : 10000)
    const page = pageParam 
      ? Math.max(1, parseInt(pageParam)) 
      : (offsetParam ? Math.floor(parseInt(offsetParam) / limit) + 1 : 1)
    const offset = offsetParam 
      ? parseInt(offsetParam) 
      : (page - 1) * limit

    const conditions: any[] = [
      eq(transactions.workspaceId, context.workspaceId),
      eq(transactions.userId, context.userId),
    ]

    if (typeParam && (typeParam === "income" || typeParam === "expense" || typeParam === "investment" || typeParam === "transfer")) {
      conditions.push(eq(transactions.type, typeParam))
    }

    if (category && category !== "all") {
      conditions.push(eq(transactions.category, category))
    }

    if (search) {
      conditions.push(
        or(
          ilike(transactions.description, `%${search}%`),
          ilike(transactions.category, `%${search}%`)
        )!
      )
    }

    if (month && month !== "all") {
      conditions.push(sql`${transactions.date}::text LIKE ${month + '%'}`)
    }

    // Run queries: paginated records, matching stats (total & sum), and module counts
    const [data, statsResult, countsResult] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({
          total: count(),
          totalAmount: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS NUMERIC)), 0)::text`,
        })
        .from(transactions)
        .where(and(...conditions)),

      db
        .select({
          income: count(sql`CASE WHEN ${transactions.type} = 'income' THEN 1 END`),
          expense: count(sql`CASE WHEN ${transactions.type} = 'expense' THEN 1 END`),
          investment: count(sql`CASE WHEN ${transactions.type} = 'investment' THEN 1 END`),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, context.workspaceId),
            eq(transactions.userId, context.userId)
          )
        ),
    ])

    const total = Number(statsResult[0]?.total || 0)
    const totalAmount = parseFloat(statsResult[0]?.totalAmount || "0")
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        offset,
        total,
        totalPages,
      },
      totalAmount,
      counts: {
        income: Number(countsResult[0]?.income || 0),
        expense: Number(countsResult[0]?.expense || 0),
        investment: Number(countsResult[0]?.investment || 0),
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
