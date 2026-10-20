/**
 * GET /api/mobile/dashboard
 *
 * Everything the mobile home screen needs in one call. Mirrors what app/dashboard/page.tsx
 * computes on the server for the web dashboard, with the 7-day chart done in grouped queries.
 *
 * `?date=YYYY-MM-DD` is the caller's local day. "Today" (the 7-day chart's last day, the month, and the `today` block)
 * is computed for that day, so a phone in a timezone ahead of or behind the server still sees its own day. Without it,
 * or with anything that is not a real date, the server's UTC day is used.
 */

import { NextResponse } from "next/server"
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm"
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
  budgets,
} from "@/lib/db"

const DAY_MS = 86_400_000

/** The caller's day when `?date=` is a real calendar date, otherwise the server's UTC day. */
function resolveToday(param: string | null) {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const parsed = new Date(`${param}T00:00:00Z`)
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(param)) return param
  }
  return new Date().toISOString().split("T")[0]
}

function dayOffset(today: string, offsetDays: number) {
  return new Date(new Date(`${today}T00:00:00Z`).getTime() - offsetDays * DAY_MS).toISOString().split("T")[0]
}

export async function GET(request: Request) {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()

    const today = resolveToday(new URL(request.url).searchParams.get("date"))
    const days = Array.from({ length: 7 }, (_, i) => dayOffset(today, 6 - i))
    const firstDay = days[0]
    const currentMonth = today.slice(0, 7)
    const monthStart = `${currentMonth}-01`
    const mine = (table: any) => and(eq(table.workspaceId, workspaceId), eq(table.userId, userId))

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
      foodToday,
      fitnessToday,
      timeToday,
      timeTopCategory,
      spentToday,
      monthBudgets,
      monthExpenseByCategory,
      pinnedNotes,
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
            gte(transactions.date, monthStart),
            lte(transactions.date, today)
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
      db
        .select({
          calories: sql<string>`coalesce(sum(${food.calories}), 0)::text`,
          protein: sql<string>`coalesce(sum(${food.protein}), 0)::text`,
          carbs: sql<string>`coalesce(sum(${food.carbs}), 0)::text`,
          fats: sql<string>`coalesce(sum(${food.fats}), 0)::text`,
          meals: count(),
        })
        .from(food)
        .where(and(mine(food), eq(food.date, today))),
      db
        .select({
          minutesToday: sql<string>`coalesce(sum(case when ${fitness.date} = ${today} then ${fitness.duration} else 0 end), 0)::text`,
          minutesWeek: sql<string>`coalesce(sum(${fitness.duration}), 0)::text`,
          workoutsToday: sql<string>`count(*) filter (where ${fitness.date} = ${today})::text`,
          workoutsWeek: count(),
          activeDaysWeek: sql<string>`count(distinct ${fitness.date})::text`,
        })
        .from(fitness)
        .where(and(mine(fitness), eq(fitness.type, "workout"), gte(fitness.date, firstDay), lte(fitness.date, today))),
      db
        .select({ minutes: sql<string>`coalesce(sum(${timeLogs.duration}), 0)::text` })
        .from(timeLogs)
        .where(and(mine(timeLogs), eq(timeLogs.date, today))),
      db
        .select({ category: timeLogs.category, minutes: sql<string>`sum(${timeLogs.duration})::text` })
        .from(timeLogs)
        .where(and(mine(timeLogs), eq(timeLogs.date, today)))
        .groupBy(timeLogs.category)
        .orderBy(sql`sum(${timeLogs.duration}) desc`)
        .limit(1),
      db
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)::text` })
        .from(transactions)
        .where(and(mine(transactions), eq(transactions.type, "expense"), eq(transactions.date, today))),
      db
        .select({ category: budgets.category, amount: budgets.amount })
        .from(budgets)
        .where(and(mine(budgets), eq(budgets.month, currentMonth))),
      db
        .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})::text` })
        .from(transactions)
        .where(and(mine(transactions), eq(transactions.type, "expense"), gte(transactions.date, monthStart), lte(transactions.date, today)))
        .groupBy(transactions.category),
      db
        .select()
        .from(notes)
        .where(and(mine(notes), eq(notes.isPinned, true), eq(notes.isArchived, false)))
        .orderBy(desc(notes.updatedAt))
        .limit(3),
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

    const spentByCategory = new Map(monthExpenseByCategory.map((row) => [row.category, Number(row.total)]))
    const budgetTotal = monthBudgets.reduce((sum, row) => sum + Number(row.amount), 0)
    const budgetSpent = monthBudgets.reduce((sum, row) => sum + (spentByCategory.get(row.category) ?? 0), 0)
    const week = fitnessToday[0]

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
      today: {
        date: today,
        food: {
          calories: Number(foodToday[0]?.calories ?? 0),
          protein: Number(foodToday[0]?.protein ?? 0),
          carbs: Number(foodToday[0]?.carbs ?? 0),
          fats: Number(foodToday[0]?.fats ?? 0),
          meals: Number(foodToday[0]?.meals ?? 0),
        },
        fitness: {
          minutesToday: Number(week?.minutesToday ?? 0),
          minutesWeek: Number(week?.minutesWeek ?? 0),
          workoutsToday: Number(week?.workoutsToday ?? 0),
          workoutsWeek: Number(week?.workoutsWeek ?? 0),
          activeDaysWeek: Number(week?.activeDaysWeek ?? 0),
        },
        time: {
          minutesToday: Number(timeToday[0]?.minutes ?? 0),
          topCategory: timeTopCategory[0]?.category ?? null,
        },
        finance: {
          spentToday: Number(spentToday[0]?.total ?? 0),
          budgetTotal,
          budgetSpent,
          budgetCount: monthBudgets.length,
        },
        pinnedNotes: pinnedNotes.map((note) => {
          const checklist = Array.isArray(note.metadata?.checklist) ? (note.metadata.checklist as { completed?: boolean }[]) : null
          // The whole row, so the app can open the note editor straight from Home.
          return {
            ...note,
            preview: (note.content ?? "").slice(0, 140),
            checklistDone: checklist ? checklist.filter((item) => item.completed).length : null,
            checklistTotal: checklist ? checklist.length : null,
          }
        }),
      },
    })
  } catch (error) {
    console.error("[Mobile Dashboard API] error:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
