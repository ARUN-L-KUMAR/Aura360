/**
 * GET /api/mobile/dashboard
 *
 * Everything the mobile home screen needs in one call. Mirrors what app/dashboard/page.tsx
 * computes on the server for the web dashboard, with the 7-day chart done in grouped queries.
 */

import { NextResponse } from "next/server"
import { and, count, desc, eq, gte, sql } from "drizzle-orm"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import {
  db,
  transactions,
  notes,
  fitness,
  food,
  fashionItems,
  savedItems,
  skincare,
  timeLogs,
  users,
} from "@/lib/db"

function isoDay(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return d.toISOString().split("T")[0]
}

export async function GET() {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()

    const days = Array.from({ length: 7 }, (_, i) => isoDay(6 - i))
    const firstDay = days[0]
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`

    const countFor = (table: any) =>
      db
        .select({ count: count() })
        .from(table)
        .where(and(eq(table.workspaceId, workspaceId), eq(table.userId, userId)))

    const perDay = (table: any, dateColumn: any) =>
      db
        .select({ day: sql<string>`${dateColumn}::text`, count: count() })
        .from(table)
        .where(and(eq(table.userId, userId), gte(dateColumn, firstDay)))
        .groupBy(dateColumn)

    const [
      profileRows,
      txCount,
      noteCount,
      fitnessCount,
      foodCount,
      fashionCount,
      savedCount,
      skincareCount,
      timeCount,
      recentTransactions,
      monthTotals,
      txPerDay,
      fitnessPerDay,
      foodPerDay,
      notesPerDay,
    ] = await Promise.all([
      db.select({ name: users.name, image: users.image }).from(users).where(eq(users.id, userId)).limit(1),
      countFor(transactions),
      countFor(notes),
      countFor(fitness),
      countFor(food),
      countFor(fashionItems),
      countFor(savedItems),
      countFor(skincare),
      countFor(timeLogs),
      db
        .select()
        .from(transactions)
        .where(and(eq(transactions.workspaceId, workspaceId), eq(transactions.userId, userId)))
        .orderBy(desc(transactions.createdAt))
        .limit(5),
      db
        .select({
          type: transactions.type,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)::text`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, workspaceId),
            eq(transactions.userId, userId),
            gte(transactions.date, monthStart)
          )
        )
        .groupBy(transactions.type),
      perDay(transactions, transactions.date),
      perDay(fitness, fitness.date),
      perDay(food, food.date),
      db
        .select({ day: sql<string>`DATE(${notes.createdAt})::text`, count: count() })
        .from(notes)
        .where(and(eq(notes.userId, userId), gte(notes.createdAt, new Date(`${firstDay}T00:00:00Z`))))
        .groupBy(sql`DATE(${notes.createdAt})`),
    ])

    const counts = {
      finance: txCount[0]?.count ?? 0,
      notes: noteCount[0]?.count ?? 0,
      fitness: fitnessCount[0]?.count ?? 0,
      food: foodCount[0]?.count ?? 0,
      fashion: fashionCount[0]?.count ?? 0,
      saved: savedCount[0]?.count ?? 0,
      skincare: skincareCount[0]?.count ?? 0,
      time: timeCount[0]?.count ?? 0,
    }

    const activityByDay = new Map<string, number>()
    for (const rows of [txPerDay, fitnessPerDay, foodPerDay, notesPerDay]) {
      for (const row of rows) {
        activityByDay.set(row.day, (activityByDay.get(row.day) ?? 0) + Number(row.count))
      }
    }
    const chart = days.map((day) => ({ date: day, activities: activityByDay.get(day) ?? 0 }))

    const monthTotal = (type: string) =>
      Number(monthTotals.find((row) => row.type === type)?.total ?? 0)

    return NextResponse.json({
      profile: profileRows[0] ?? { name: null, image: null },
      totalActivities: Object.values(counts).reduce((sum, value) => sum + Number(value), 0),
      counts,
      chart,
      month: {
        income: monthTotal("income"),
        expense: monthTotal("expense"),
        investment: monthTotal("investment"),
      },
      recentTransactions,
    })
  } catch (error) {
    console.error("[Mobile Dashboard API] error:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
