import { z } from "zod"
import { DEFAULT_TIMEZONE } from "./time"

/** Notification settings shape, defaults and merging. No database code here, so it is safe to import in the browser. */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
const weekday = z.number().int().min(0).max(6)

export const notificationPrefsSchema = z.object({
  timezone: z.string().max(60),
  /** Extra channels. In-app notifications are always on. */
  email: z.boolean(),
  push: z.boolean(),
  /** No email or push during these hours (in-app still shows up). */
  quietHours: z.object({ enabled: z.boolean(), start: hhmm, end: hhmm }),

  budget: z.object({ enabled: z.boolean() }),
  subscriptions: z.object({ enabled: z.boolean() }),
  workout: z.object({
    enabled: z.boolean(),
    time: hhmm,
    days: z.array(weekday).max(7),
    onlyIfNotLogged: z.boolean(),
  }),
  meals: z.object({
    enabled: z.boolean(),
    breakfast: hhmm.nullable(),
    lunch: hhmm.nullable(),
    dinner: hhmm.nullable(),
    onlyIfNotLogged: z.boolean(),
  }),
  skincare: z.object({ enabled: z.boolean(), morning: hhmm.nullable(), evening: hhmm.nullable() }),
  fashion: z.object({
    enabled: z.boolean(),
    /** Wardrobe pieces not worn for this many days count as unworn */
    unwornDays: z.number().int().min(14).max(365),
    weekday,
    time: hhmm,
  }),
})

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

export const DEFAULT_PREFS: NotificationPrefs = {
  timezone: DEFAULT_TIMEZONE,
  email: false,
  push: true,
  quietHours: { enabled: true, start: "22:00", end: "07:00" },
  budget: { enabled: true },
  subscriptions: { enabled: true },
  workout: { enabled: false, time: "18:00", days: [1, 2, 3, 4, 5, 6], onlyIfNotLogged: true },
  meals: { enabled: false, breakfast: "08:30", lunch: "13:00", dinner: "20:00", onlyIfNotLogged: true },
  skincare: { enabled: false, morning: "07:30", evening: "21:30" },
  fashion: { enabled: true, unwornDays: 60, weekday: 0, time: "10:00" },
}

/** Fills anything missing (or invalid) in a stored object with the defaults, section by section. */
export function mergePrefs(stored: unknown): NotificationPrefs {
  const input = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>
  const merged: Record<string, unknown> = { ...DEFAULT_PREFS }

  for (const key of Object.keys(DEFAULT_PREFS) as Array<keyof NotificationPrefs>) {
    const value = input[key]
    if (value === undefined) continue
    const base = DEFAULT_PREFS[key]
    merged[key] = base && typeof base === "object" && !Array.isArray(base) && typeof value === "object" ? { ...base, ...(value as object) } : value
  }

  const parsed = notificationPrefsSchema.safeParse(merged)
  if (parsed.success) return parsed.data

  // One bad section shouldn't discard the rest: keep each section that is valid on its own
  const safe: Record<string, unknown> = {}
  for (const key of Object.keys(DEFAULT_PREFS) as Array<keyof NotificationPrefs>) {
    const section = (notificationPrefsSchema.shape as Record<string, z.ZodTypeAny>)[key].safeParse(merged[key])
    safe[key] = section.success ? section.data : DEFAULT_PREFS[key]
  }
  return safe as NotificationPrefs
}

