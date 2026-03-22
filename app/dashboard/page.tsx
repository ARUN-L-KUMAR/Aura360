import { getAuthSession } from "@/lib/auth-helpers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StickyNote, DollarSign, Dumbbell, UtensilsCrossed, Bookmark, Shirt, Sparkles, Clock, User, Settings, Plus, TrendingUp, Calendar, Home, ChevronRight, Activity, ArrowUpRight, Zap, Target, BarChart3, TrendingDown } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { db, transactions, notes, fitness, food, fashionItems, savedItems, skincare, timeLogs, users } from "@/lib/db"
import { eq, and, count, desc, gte, sql } from "drizzle-orm"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function DashboardPage() {
  const session = await getAuthSession()
  const user = session.user

  // Fetch actual stats from database
  const workspaceId = user.workspaceId
  const userId = user.id

  // Get date 7 days ago
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  // Fetch daily activity counts for the last 7 days
  // This is a simplified version, in a real app you might want a more optimized query
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  }).reverse()

  const chartData = await Promise.all(days.map(async (day) => {
    // Count transactions for this day
    const [tCount] = await db.select({ count: count() }).from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.date, day)))
    const [nCount] = await db.select({ count: count() }).from(notes).where(and(eq(notes.userId, userId), sql`DATE(${notes.createdAt}) = ${day}`))
    const [fCount] = await db.select({ count: count() }).from(fitness).where(and(eq(fitness.userId, userId), eq(fitness.date, day)))
    const [foodCount] = await db.select({ count: count() }).from(food).where(and(eq(food.userId, userId), eq(food.date, day)))
    
    return {
      name: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
      activities: (tCount?.count || 0) + (nCount?.count || 0) + (fCount?.count || 0) + (foodCount?.count || 0)
    }
  }))

  // Count transactions
  const [transactionStats] = await db
    .select({ count: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.userId, userId)
      )
    )

  // Count notes
  const [noteStats] = await db
    .select({ count: count() })
    .from(notes)
    .where(
      and(
        eq(notes.workspaceId, workspaceId),
        eq(notes.userId, userId)
      )
    )

  // Count fitness logs
  const [fitnessStats] = await db
    .select({ count: count() })
    .from(fitness)
    .where(
      and(
        eq(fitness.workspaceId, workspaceId),
        eq(fitness.userId, userId)
      )
    )

  // Count food logs
  const [foodStats] = await db
    .select({ count: count() })
    .from(food)
    .where(
      and(
        eq(food.workspaceId, workspaceId),
        eq(food.userId, userId)
      )
    )

  // Count fashion items
  const [fashionStats] = await db
    .select({ count: count() })
    .from(fashionItems)
    .where(
      and(
        eq(fashionItems.workspaceId, workspaceId),
        eq(fashionItems.userId, userId)
      )
    )

  // Count saved items
  const [savedStats] = await db
    .select({ count: count() })
    .from(savedItems)
    .where(
      and(
        eq(savedItems.workspaceId, workspaceId),
        eq(savedItems.userId, userId)
      )
    )

  // Count skincare items
  const [skincareStats] = await db
    .select({ count: count() })
    .from(skincare)
    .where(
      and(
        eq(skincare.workspaceId, workspaceId),
        eq(skincare.userId, userId)
      )
    )

  // Count time logs
  const [timeStats] = await db
    .select({ count: count() })
    .from(timeLogs)
    .where(
      and(
        eq(timeLogs.workspaceId, workspaceId),
        eq(timeLogs.userId, userId)
      )
    )

  // Fetch recent transactions
  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.userId, userId)
      )
    )
    .orderBy(desc(transactions.createdAt))
    .limit(5)

  const transactionsCount = transactionStats?.count || 0
  const notesCount = noteStats?.count || 0
  const fitnessCount = fitnessStats?.count || 0
  const foodCount = foodStats?.count || 0
  const fashionCount = fashionStats?.count || 0
  const savedCount = savedStats?.count || 0
  const skincareCount = skincareStats?.count || 0
  const timeLogsCount = timeStats?.count || 0
  
  // Calculate total activities
  const totalActivities = transactionsCount + notesCount + fitnessCount + foodCount + 
                          fashionCount + savedCount + skincareCount + timeLogsCount

  // Get user profile
  const [profile] = await db
    .select({
      full_name: users.name,
      avatar_url: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return (
    <DashboardClient 
      user={JSON.parse(JSON.stringify(user))}
      profile={profile}
      totalActivities={totalActivities}
      recentTransactions={JSON.parse(JSON.stringify(recentTransactions))}
      chartData={chartData}
      counts={{
        notes: notesCount,
        finance: transactionsCount,
        fitness: fitnessCount,
        food: foodCount,
        saved: savedCount,
        fashion: fashionCount,
        skincare: skincareCount,
        time: timeLogsCount,
      }}
    />
  )
}
