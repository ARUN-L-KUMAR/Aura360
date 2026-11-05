/**
 * Pure helpers that turn logged workouts into the numbers the Fitness charts show: minutes per weekday, the current
 * streak, rolling weeks and personal bests. No React, no app imports (only types), so they run under node:test
 * (tests/fitness-activity.test.ts). Everything is derived from entries the API already returns: nothing is invented.
 */

/** One logged workout, reduced to what the charts need. */
export type ActivityItem = { date: string; minutes: number; volume: number };

/** Workouts a person aims for over a week. The 150 active minutes a week is the public health guideline for adults. */
export const WEEKLY_GOAL_MINUTES = 150;

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-09" for a date, in the phone's timezone. */
export function isoOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** The day `delta` days after (or before, when negative) an ISO day. Calendar arithmetic, so daylight saving cannot shift it. */
export function addDays(iso: string, delta: number): string {
  const date = parseIso(iso);
  return isoOf(new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta));
}

const finite = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** Minutes of activity for each of the 7 days of the current week, Monday first. */
export function weekMinutes(items: readonly ActivityItem[], today = new Date()): number[] {
  const offset = (today.getDay() + 6) % 7;
  const monday = isoOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset));
  const totals = new Map<string, number>();
  for (const item of items) {
    const day = item.date.slice(0, 10);
    totals.set(day, (totals.get(day) ?? 0) + finite(item.minutes));
  }
  return Array.from({ length: 7 }, (_, i) => totals.get(addDays(monday, i)) ?? 0);
}

/** Index (0 = Monday) of today inside the current week. */
export const todayIndexOf = (today = new Date()) => (today.getDay() + 6) % 7;

/**
 * Days in a row with at least one workout, counted back from today. A streak is still alive while today is open, so
 * when nothing is logged yet today it counts back from yesterday instead.
 */
export function currentStreak(days: ReadonlySet<string>, today = new Date()): number {
  let cursor = isoOf(today);
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The last `count` days ending today, oldest first, with whether each had a workout. */
export function lastDays(days: ReadonlySet<string>, count: number, today = new Date()): { iso: string; done: boolean }[] {
  const end = isoOf(today);
  return Array.from({ length: count }, (_, i) => {
    const iso = addDays(end, i - (count - 1));
    return { iso, done: days.has(iso) };
  });
}

export type WeekTotals = { minutes: number; volume: number; sessions: number };

/**
 * Totals for `count` windows of 7 days that end today, oldest first (the last one is "the last 7 days"). Rolling
 * windows compare like with like: a half-finished calendar week would always look like a drop.
 */
export function rollingWeeks(items: readonly ActivityItem[], count: number, today = new Date()): WeekTotals[] {
  const end = isoOf(today);
  const weeks: WeekTotals[] = Array.from({ length: Math.max(0, count) }, () => ({ minutes: 0, volume: 0, sessions: 0 }));
  const start = addDays(end, -(weeks.length * 7 - 1));
  for (const item of items) {
    const day = item.date.slice(0, 10);
    if (day < start || day > end) continue;
    const daysAgo = Math.round((parseIso(end).getTime() - parseIso(day).getTime()) / 86_400_000);
    const index = weeks.length - 1 - Math.floor(daysAgo / 7);
    const week = weeks[index];
    if (!week) continue;
    week.minutes += finite(item.minutes);
    week.volume += finite(item.volume);
    week.sessions += 1;
  }
  return weeks;
}

/** Whole-number percent change from `previous` to `current`, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!(previous > 0) || !Number.isFinite(current)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type Direction = 'up' | 'down' | 'flat';
export const directionOf = (change: number): Direction => (change > 0 ? 'up' : change < 0 ? 'down' : 'flat');

/** One time an exercise was lifted: the heaviest set reduced to its weight and reps. */
export type LiftSample = { name: string; date: string; weight: number; reps: number };

export type PersonalBest = {
  name: string;
  weight: number;
  reps: number;
  date: string;
  /** Heaviest weight per session, oldest first: the trend line. */
  series: number[];
  /** The best weight was set in the latest session and beats every earlier one. */
  isNew: boolean;
};

/**
 * Heaviest weight per exercise, with the weight trend and whether the latest session set a new record. Exercises with
 * no weight are skipped (bodyweight work has nothing to chart). The most trained exercises come first.
 */
export function personalBests(samples: readonly LiftSample[], limit = 5): PersonalBest[] {
  type Indexed = LiftSample & { order: number };
  const groups = new Map<string, Indexed[]>();
  samples.forEach((sample, order) => {
    const key = sample.name.trim().toLowerCase();
    if (!key || !(sample.weight > 0)) return;
    const list = groups.get(key) ?? [];
    list.push({ ...sample, name: sample.name.trim(), date: sample.date.slice(0, 10), order });
    groups.set(key, list);
  });

  const bests: PersonalBest[] = [];
  for (const list of groups.values()) {
    // Samples arrive newest first (the API order): sort by day, and within a day the later position is the older one.
    const ordered = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.order - a.order));
    let best = ordered[0];
    for (const sample of ordered) if (sample.weight >= best.weight) best = sample;
    const latest = ordered[ordered.length - 1];
    const earlier = ordered.slice(0, -1);
    const isNew = earlier.length > 0 && latest.weight === best.weight && earlier.every((s) => s.weight < latest.weight);
    bests.push({ name: best.name, weight: best.weight, reps: best.reps, date: best.date, series: ordered.map((s) => s.weight), isNew });
  }
  return bests.sort((a, b) => b.series.length - a.series.length || b.weight - a.weight).slice(0, Math.max(0, limit));
}
