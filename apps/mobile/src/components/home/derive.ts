/**
 * Pure helpers that turn the dashboard payload into what the Home widgets draw. No React, no React Native, no path
 * aliases: runs under plain Node so `tests/home-derive.test.ts` can cover it. Nothing here invents data: every value is
 * read or computed from what `/api/mobile/dashboard` returns.
 */

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

/** Hero variant from the local hour: 5-10 morning, 11-16 day, 17-19 evening, otherwise night. */
export function timeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export type ChartPoint = { date: string; activities: number };

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** Activity counts of the chart, oldest first. Bad numbers read as 0. */
export function activitySeries(chart: readonly ChartPoint[]): number[] {
  return chart.map((point) => count(point.activities));
}

/** Index of `todayIso` ("2026-10-17") in the chart, else the last point (the API ends the series on today). -1 if empty. */
export function todayIndexOf(chart: readonly ChartPoint[], todayIso: string): number {
  if (chart.length === 0) return -1;
  const found = chart.findIndex((point) => point.date.slice(0, 10) === todayIso);
  return found >= 0 ? found : chart.length - 1;
}

/**
 * Consecutive active days ending today. A quiet today does not break the streak yet (the day is not over), so it counts
 * back from yesterday instead. Capped by the length of the series.
 */
export function streakOf(series: readonly number[], todayIndex: number): number {
  if (todayIndex < 0 || todayIndex >= series.length) return 0;
  let i = series[todayIndex] > 0 ? todayIndex : todayIndex - 1;
  let streak = 0;
  while (i >= 0 && series[i] > 0) {
    streak += 1;
    i -= 1;
  }
  return streak;
}

export type DayDelta = { direction: 'up' | 'down' | 'flat'; amount: number };

/** Today against yesterday, or null when there is no yesterday in the series. */
export function dayDelta(series: readonly number[], todayIndex: number): DayDelta | null {
  if (todayIndex < 1 || todayIndex >= series.length) return null;
  const change = series[todayIndex] - series[todayIndex - 1];
  return { direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', amount: Math.abs(change) };
}

/** Whole-number share of `part` in `whole`, 0-100. 0 when there is nothing to share. */
export function sharePercent(part: number, whole: number): number {
  const p = count(part);
  const w = count(whole);
  if (w === 0) return 0;
  return Math.min(100, Math.round((p / w) * 100));
}

/** Sum of the entry counts of every module. */
export function totalEntries(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + count(value), 0);
}

/** Income minus spending for the month (investments are money moved, not spent). */
export function netOf(month: { income: number; expense: number }): number {
  const income = Number.isFinite(month.income) ? month.income : 0;
  const expense = Number.isFinite(month.expense) ? month.expense : 0;
  return income - expense;
}

/** One-character caption for a weekday name ("Mon" -> "M"), safe for non-Latin scripts. Empty stays empty. */
export function initialOf(label: string): string {
  return (Array.from(label.trim())[0] ?? '').toUpperCase();
}

/** First word of a display name, or '' when blank. */
export function firstNameOf(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

/** How many days of the series had any activity. */
export function activeDays(series: readonly number[]): number {
  return series.filter((value) => count(value) > 0).length;
}
