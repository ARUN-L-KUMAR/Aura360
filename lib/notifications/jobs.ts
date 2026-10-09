import { and, asc, eq, inArray, lt } from "drizzle-orm"
import { db, budgets, fashionItems, fitness, food, notificationLog, skincare, subscriptions, workspaceMembers, type WorkspaceContext } from "@/lib/db"
import { checkBudgetAlerts } from "@/lib/services/budget-alerts"
import { isNeglected } from "@/lib/fashion/wear-stats"
import type { FashionItem } from "@/lib/types/fashion"
import { notify, type NotificationKind, type NotifyResult } from "./dispatch"
import { loadPrefs, isMissingTable, type NotificationPrefs } from "./preferences"
import { daysBetween, isInWindow, isoWeekKey, localParts, minutesOf, type LocalParts } from "./time"

/** How long after its set time a habit reminder may still go out (covers a late scheduler run). */
const WINDOW_MINUTES = Number(process.env.NOTIFICATION_WINDOW_MINUTES ?? 90)
/** Subscription alerts are only sent in the daytime, whatever time the scheduler runs. */
const DAYTIME = { from: 9 * 60, to: 21 * 60 }

interface JobEnv {
  ctx: WorkspaceContext
  prefs: NotificationPrefs
  local: LocalParts
  now: Date
  dryRun: boolean
}

export interface JobStats {
  sent: number
  /** Only in a dry run: what would have been sent */
  previews: string[]
}

const empty = (): JobStats => ({ sent: 0, previews: [] })

function record(stats: JobStats, result: NotifyResult | null, title: string) {
  if (!result) return
  if (result.sent) stats.sent++
  else if (result.reason === "dry-run") stats.previews.push(title)
}

async function send(env: JobEnv, stats: JobStats, kind: NotificationKind, title: string, message: string, extra: { actionUrl: string; dedupeKey: string; type?: "info" | "warning" }) {
  const result = await notify({ ctx: env.ctx, kind, title, message, prefs: env.prefs, now: env.now, dryRun: env.dryRun, ...extra })
  record(stats, result, title)
}

const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" }
const money = (amount: string | number, currency: string) => `${SYMBOLS[currency] ?? `${currency} `}${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

// ── Budgets ───────────────────────────────────────────────────────────────────

/** Safety net for edits and imports that never went through the "after a transaction" check. */
async function budgetJob(env: JobEnv): Promise<JobStats> {
  const stats = empty()
  if (!env.prefs.budget.enabled) return stats

  const month = env.local.date.slice(0, 7)
  const rows = await db
    .selectDistinct({ category: budgets.category })
    .from(budgets)
    .where(and(eq(budgets.userId, env.ctx.userId), eq(budgets.month, month)))

  for (const { category } of rows) {
    record(stats, await checkBudgetAlerts(env.ctx, category, month, { prefs: env.prefs, now: env.now, dryRun: env.dryRun }), `Budget: ${category}`)
  }
  return stats
}

// ── Subscriptions / bills ─────────────────────────────────────────────────────

async function subscriptionsJob(env: JobEnv): Promise<JobStats> {
  const stats = empty()
  if (!env.prefs.subscriptions.enabled) return stats
  if (env.local.minutes < DAYTIME.from || env.local.minutes >= DAYTIME.to) return stats

  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, env.ctx.userId), eq(subscriptions.status, "active")))

  for (const sub of rows) {
    if (!sub.nextBillingDate) continue
    const days = daysBetween(env.local.date, sub.nextBillingDate)
    const reminderDays = sub.reminderDays ?? 7
    if (days < 0 || days > reminderDays) continue

    const stage = days === 0 ? "today" : days === 1 ? "tomorrow" : "upcoming"
    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`
    const verb = sub.autoRenew === false ? "ends" : "renews"
    const amount = money(sub.amount, sub.currency)

    await send(
      env,
      stats,
      "subscription",
      `${sub.name} ${verb} ${when}`,
      sub.autoRenew === false ? `${sub.name} runs out ${when} (${sub.nextBillingDate}).` : `${amount} will be charged ${when} (${sub.nextBillingDate}, ${sub.billingCycle}).`,
      {
        actionUrl: "/dashboard/finance?tab=subscriptions",
        dedupeKey: `sub:${sub.id}:${sub.nextBillingDate}:${stage}`,
        type: days <= 1 ? "warning" : "info",
      }
    )
  }
  return stats
}

// ── Workout ───────────────────────────────────────────────────────────────────

async function workoutJob(env: JobEnv): Promise<JobStats> {
  const stats = empty()
  const w = env.prefs.workout
  if (!w.enabled || !w.days.includes(env.local.weekday) || !isInWindow(env.local.minutes, w.time, WINDOW_MINUTES)) return stats

  if (w.onlyIfNotLogged) {
    const [done] = await db
      .select({ id: fitness.id })
      .from(fitness)
      .where(and(eq(fitness.userId, env.ctx.userId), eq(fitness.type, "workout"), eq(fitness.date, env.local.date)))
      .limit(1)
    if (done) return stats
  }

  await send(env, stats, "workout", "Time to move 💪", "No workout logged yet today. Even 20 minutes counts.", {
    actionUrl: "/dashboard/fitness",
    dedupeKey: `workout:${env.local.date}`,
  })
  return stats
}

// ── Meals ─────────────────────────────────────────────────────────────────────

const MEAL_COPY = {
  breakfast: { title: "Breakfast time 🍳", message: "Log what you ate so your day's nutrition stays accurate." },
  lunch: { title: "Lunch time 🥗", message: "Don't forget to log your lunch." },
  dinner: { title: "Dinner time 🍽️", message: "Log your dinner to close out the day." },
} as const

async function mealsJob(env: JobEnv): Promise<JobStats> {
  const stats = empty()
  const m = env.prefs.meals
  if (!m.enabled) return stats

  for (const meal of ["breakfast", "lunch", "dinner"] as const) {
    const slot = m[meal]
    if (!slot || !isInWindow(env.local.minutes, slot, WINDOW_MINUTES)) continue

    if (m.onlyIfNotLogged) {
      const [done] = await db
        .select({ id: food.id })
        .from(food)
        .where(and(eq(food.userId, env.ctx.userId), eq(food.mealType, meal), eq(food.date, env.local.date)))
        .limit(1)
      if (done) continue
    }
    await send(env, stats, "meal", MEAL_COPY[meal].title, MEAL_COPY[meal].message, {
      actionUrl: "/dashboard/food",
      dedupeKey: `meal:${meal}:${env.local.date}`,
    })
  }
  return stats
}

// ── Skincare ──────────────────────────────────────────────────────────────────

async function skincareJob(env: JobEnv): Promise<JobStats> {
  const stats = empty()
  const s = env.prefs.skincare
  if (!s.enabled) return stats

  for (const part of ["morning", "evening"] as const) {
    const slot = s[part]
    if (!slot || !isInWindow(env.local.minutes, slot, WINDOW_MINUTES)) continue

    const products = await db
      .select({ name: skincare.productName })
      .from(skincare)
      .where(
        and(
          eq(skincare.userId, env.ctx.userId),
          eq(skincare.status, "owned"),
          inArray(skincare.routineTime, [part, "both"])
        )
      )
      .orderBy(asc(skincare.routineOrder))
    if (products.length === 0) continue // nothing in that routine, nothing to remind about

    const list = products.slice(0, 4).map((p) => p.name).join(", ")
    await send(
      env,
      stats,
      "skincare",
      part === "morning" ? "Morning skincare ☀️" : "Evening skincare 🌙",
      `${list}${products.length > 4 ? ` and ${products.length - 4} more` : ""}.`,
      { actionUrl: "/dashboard/skincare", dedupeKey: `skincare:${part}:${env.local.date}` }
    )
  }
  return stats
}

// ── Unworn clothes (weekly) ───────────────────────────────────────────────────

async function fashionJob(env: JobEnv): Promise<JobStats> {
  const stats = empty()
  const f = env.prefs.fashion
  if (!f.enabled || env.local.weekday !== f.weekday || env.local.minutes < minutesOf(f.time)) return stats

  const rows = await db
    .select({
      id: fashionItems.id,
      name: fashionItems.name,
      status: fashionItems.status,
      lastWornDate: fashionItems.lastWornDate,
      purchaseDate: fashionItems.purchaseDate,
      createdAt: fashionItems.createdAt,
    })
    .from(fashionItems)
    .where(and(eq(fashionItems.userId, env.ctx.userId), eq(fashionItems.status, "wardrobe")))

  const unworn = rows.filter((item) => isNeglected(item as unknown as FashionItem, f.unwornDays, env.now))
  if (unworn.length === 0) return stats

  const names = unworn.slice(0, 3).map((i) => i.name).join(", ")
  await send(
    env,
    stats,
    "fashion",
    `${unworn.length} piece${unworn.length === 1 ? "" : "s"} you haven't worn in ${f.unwornDays}+ days 👕`,
    `${names}${unworn.length > 3 ? ` and ${unworn.length - 3} more` : ""}. Wear one this week, or donate or sell it.`,
    { actionUrl: "/dashboard/fashion", dedupeKey: `unworn:${isoWeekKey(env.local.date)}` }
  )
  return stats
}

// ── Runner ────────────────────────────────────────────────────────────────────

const JOBS: Array<[string, (env: JobEnv) => Promise<JobStats>]> = [
  ["budget", budgetJob],
  ["subscriptions", subscriptionsJob],
  ["workout", workoutJob],
  ["meals", mealsJob],
  ["skincare", skincareJob],
  ["fashion", fashionJob],
]

export interface RunSummary {
  ranAt: string
  dryRun: boolean
  users: number
  sent: number
  byJob: Record<string, number>
  /** Dry run only */
  previews: Array<{ userId: string; title: string }>
  errors: string[]
}

/** Runs every job for every user. Safe to call as often as every 5-15 minutes: de-duplication keeps each alert to once. */
export async function runNotificationJobs(options: { now?: Date; dryRun?: boolean } = {}): Promise<RunSummary> {
  const now = options.now ?? new Date()
  const dryRun = options.dryRun ?? false
  const summary: RunSummary = { ranAt: now.toISOString(), dryRun, users: 0, sent: 0, byJob: {}, previews: [], errors: [] }

  // One workspace per user (their first)
  const members = await db
    .select({ userId: workspaceMembers.userId, workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .orderBy(asc(workspaceMembers.joinedAt))
  const seen = new Set<string>()
  const targets = members.filter((m) => (seen.has(m.userId) ? false : (seen.add(m.userId), true)))
  summary.users = targets.length

  for (const ctx of targets) {
    const prefs = await loadPrefs(ctx.userId)
    const env: JobEnv = { ctx, prefs, local: localParts(now, prefs.timezone), now, dryRun }

    for (const [name, job] of JOBS) {
      try {
        const stats = await job(env)
        summary.sent += stats.sent
        summary.byJob[name] = (summary.byJob[name] ?? 0) + stats.sent
        stats.previews.forEach((title) => summary.previews.push({ userId: ctx.userId, title }))
      } catch (error) {
        if (isMissingTable(error)) throw error
        summary.errors.push(`${name} (${ctx.userId.slice(0, 8)}): ${error instanceof Error ? error.message : "failed"}`)
      }
    }
  }

  // Housekeeping: forget de-duplication keys older than ~4 months
  if (!dryRun) {
    await db
      .delete(notificationLog)
      .where(lt(notificationLog.createdAt, new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)))
      .catch(() => undefined)
  }
  return summary
}
