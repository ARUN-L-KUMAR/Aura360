import { NextResponse } from 'next/server'
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, walletBalances } from "@/lib/db"
import { eq, and } from "drizzle-orm"

/**
 * Simple Balance Management
 * Stores manual balance entries only (what you actually have)
 * Required balance is calculated from transactions
 */

/**
 * GET /api/finance/balances
 * Fetch manually entered wallet balances
 */
export async function GET(request: Request) {
  try {
    const context = await getWorkspaceContext()
    
    // Get stored manual balances
    const balances = await db
      .select()
      .from(walletBalances)
      .where(
        and(
          eq(walletBalances.workspaceId, context.workspaceId),
          eq(walletBalances.userId, context.userId)
        )
      )

    // Calculate total available balance
    const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.currentBalance), 0)

    return NextResponse.json({
      success: true,
      data: balances,
      totalBalance: totalBalance.toFixed(2),
    })
  } catch (error) {
    console.error("[Balances API Error]", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch balances" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/balances
 * Update manual balance entries (what you actually have)
 */
export async function PUT(request: Request) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    
    const { cash_balance, account_balance } = body

    // Validate inputs
    if (typeof cash_balance !== 'number' || typeof account_balance !== 'number') {
      return NextResponse.json(
        { success: false, error: "Invalid balance values" },
        { status: 400 }
      )
    }

    // Update or insert cash balance
    await db
      .insert(walletBalances)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        paymentMethod: 'cash',
        currentBalance: cash_balance.toFixed(2),
        lastRecalculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          walletBalances.workspaceId,
          walletBalances.userId,
          walletBalances.paymentMethod,
        ],
        set: {
          currentBalance: cash_balance.toFixed(2),
          lastRecalculatedAt: new Date(),
          updatedAt: new Date(),
        },
      })

    // Update or insert UPI balance
    await db
      .insert(walletBalances)
      .values({
        workspaceId: context.workspaceId,
        userId: context.userId,
        paymentMethod: 'upi',
        currentBalance: account_balance.toFixed(2),
        lastRecalculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          walletBalances.workspaceId,
          walletBalances.userId,
          walletBalances.paymentMethod,
        ],
        set: {
          currentBalance: account_balance.toFixed(2),
          lastRecalculatedAt: new Date(),
          updatedAt: new Date(),
        },
      })

    return NextResponse.json({
      success: true,
      message: "Balances updated successfully",
    })
  } catch (error) {
    console.error("[Balance Update Error]", error)
    return NextResponse.json(
      { success: false, error: "Failed to update balances" },
      { status: 500 }
    )
  }
}
