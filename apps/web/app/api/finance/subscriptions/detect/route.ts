import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions, subscriptions } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import type { DetectedRecurringTransaction } from "@/lib/types/finance"

// Known recurring keywords / providers to boost pattern match
const KNOWN_SUBSCRIPTION_KEYWORDS = [
  "netflix",
  "spotify",
  "prime",
  "amazon prime",
  "youtube",
  "hotstar",
  "disney",
  "hulu",
  "apple",
  "icloud",
  "google one",
  "chatgpt",
  "openai",
  "github",
  "aws",
  "adobe",
  "canva",
  "gym",
  "fitness",
  "wifi",
  "broadband",
  "jio",
  "airtel",
  "rent",
  "maintenance",
  "electricity",
  "water bill",
  "newspaper",
  "claude",
  "cursor",
  "notion",
]

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[0-9]{5,}/g, "") // remove long reference ids
    .replace(/\b(payment|bill|recharge|subscription|sub|fee|autopay|upi|ref)\b/gi, "")
    .trim()
}

export async function GET() {
  try {
    const context = await getWorkspaceContext()

    // 1. Fetch existing tracked subscriptions to exclude them
    const existingSubs = await db
      .select({ name: subscriptions.name })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.workspaceId, context.workspaceId),
          eq(subscriptions.userId, context.userId)
        )
      )

    const trackedNames = new Set(existingSubs.map((s) => s.name.toLowerCase().trim()))

    // 2. Fetch historical expense transactions (up to 1,000 recent)
    const expenseTx = await db
      .select({
        description: transactions.description,
        category: transactions.category,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, context.workspaceId),
          eq(transactions.userId, context.userId),
          eq(transactions.type, "expense")
        )
      )
      .orderBy(desc(transactions.date))
      .limit(1000)

    // 3. Group by normalized merchant/description
    const groups = new Map<
      string,
      Array<{ amount: number; date: Date; rawDesc: string; category: string }>
    >()

    for (const tx of expenseTx) {
      const rawDesc = tx.description || "Unknown"
      const normalized = normalizeDescription(rawDesc)
      if (normalized.length < 2) continue

      // Find best match key
      let matchedKey = normalized
      for (const key of Array.from(groups.keys())) {
        if (key.includes(normalized) || normalized.includes(key)) {
          matchedKey = key
          break
        }
      }

      if (!groups.has(matchedKey)) {
        groups.set(matchedKey, [])
      }

      groups.get(matchedKey)!.push({
        amount: parseFloat(tx.amount.toString()),
        date: new Date(tx.date),
        rawDesc,
        category: tx.category || "Subscriptions",
      })
    }

    // 4. Analyze candidate recurring patterns
    const detected: DetectedRecurringTransaction[] = []

    for (const [key, items] of Array.from(groups.entries())) {
      // Check if already tracked
      let isAlreadyTracked = false
      for (const tracked of Array.from(trackedNames)) {
        if (tracked.includes(key) || key.includes(tracked)) {
          isAlreadyTracked = true
          break
        }
      }
      if (isAlreadyTracked) continue

      const count = items.length
      const hasKeyword = KNOWN_SUBSCRIPTION_KEYWORDS.some((kw) => key.includes(kw))

      // If matches known keyword or occurred at least 2 times
      if (count >= 2 || (hasKeyword && count >= 1)) {
        // Sort dates chronologically
        items.sort((a, b) => a.date.getTime() - b.date.getTime())

        // Calculate average amount
        const avgAmount = items.reduce((sum, i) => sum + i.amount, 0) / count

        // Calculate interval
        let estimatedCycle: "monthly" | "yearly" | "weekly" = "monthly"
        if (count >= 2) {
          const first = items[0].date.getTime()
          const last = items[items.length - 1].date.getTime()
          const avgIntervalDays = (last - first) / (1000 * 60 * 60 * 24 * (count - 1))

          if (avgIntervalDays > 300) {
            estimatedCycle = "yearly"
          } else if (avgIntervalDays < 14) {
            estimatedCycle = "weekly"
          } else {
            estimatedCycle = "monthly"
          }
        }

        const confidence = hasKeyword ? 95 : Math.min(90, 50 + count * 15)
        const displayName = items[0].rawDesc
          .split(" ")
          .slice(0, 3)
          .join(" ")
          .replace(/[0-9]+/g, "")
          .trim() || key

        detected.push({
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          category: items[0].category || "Subscriptions",
          amount: Math.round(avgAmount * 100) / 100,
          estimatedCycle,
          occurrences: count,
          lastDate: items[items.length - 1].date.toISOString().split("T")[0],
          confidence,
        })
      }
    }

    // Sort by confidence and occurrences
    detected.sort((a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences)

    return NextResponse.json({
      success: true,
      data: detected.slice(0, 10), // return top 10 detected
    })
  } catch (error: any) {
    console.error("Error detecting recurring transactions:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to detect recurring transactions" },
      { status: 500 }
    )
  }
}
