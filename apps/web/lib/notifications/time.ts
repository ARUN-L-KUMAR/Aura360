/** Local-time helpers: reminders fire at the user's own clock time, whatever timezone the server runs in. */

export const DEFAULT_TIMEZONE = "Asia/Kolkata"

export interface LocalParts {
  /** YYYY-MM-DD in the user's timezone */
  date: string
  /** minutes since local midnight */
  minutes: number
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function safeTimezone(timeZone: string | undefined): string {
  if (!timeZone) return DEFAULT_TIMEZONE
  try {
    new Intl.DateTimeFormat("en", { timeZone })
    return timeZone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

export function localParts(now: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    weekday: Math.max(0, WEEKDAYS.indexOf(get("weekday"))),
  }
}

/** "07:30" -> 450 */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/** True from the reminder time until `windowMinutes` later (so a delayed scheduler run still delivers it). */
export function isInWindow(nowMinutes: number, slot: string, windowMinutes: number): boolean {
  const start = minutesOf(slot)
  return nowMinutes >= start && nowMinutes < start + windowMinutes
}

/** Quiet hours may wrap past midnight (22:00 -> 07:00). */
export function inQuietHours(nowMinutes: number, start: string, end: string): boolean {
  const s = minutesOf(start)
  const e = minutesOf(end)
  if (s === e) return false
  return s < e ? nowMinutes >= s && nowMinutes < e : nowMinutes >= s || nowMinutes < e
}

const DAY_MS = 24 * 60 * 60 * 1000
const toUtc = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))

/** Whole days from `from` to `to` (both YYYY-MM-DD). Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

/** Last day of a YYYY-MM month as YYYY-MM-DD (handles 28/29/30/31-day months). */
export function monthEnd(month: string): string {
  const year = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return `${month}-${String(last).padStart(2, "0")}`
}

/** ISO week label like 2026-W41, used to send a weekly nudge once per week. */
export function isoWeekKey(date: string): string {
  const d = new Date(toUtc(date))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}
