/**
 * Pure helpers for the Skincare card on Home. No React, no React Native, no path aliases: runs under plain Node
 * (tests/home-skincare-card.test.ts). Nothing here invents data: the routines come from the products, and the only
 * thing taken from the clock is which of the two routines is next.
 */

export type RoutinePart = 'morning' | 'evening';

/** First hour (local, 24h) that shows the morning routine, and the hour the evening routine takes over. */
const MORNING_FROM = 4;
const EVENING_FROM = 12;

/**
 * The routine that is next to do at this hour: the morning one from 04:00 until noon, the evening one from noon until
 * 04:00 (a late night still belongs to tonight's routine). An hour that is not a number reads as evening.
 */
export function routinePartAt(hour: number): RoutinePart {
  return hour >= MORNING_FROM && hour < EVENING_FROM ? 'morning' : 'evening';
}

export type RoutinePick<T> = {
  part: RoutinePart;
  steps: T[];
  /** True when `part` is not the one for this time of day, because that routine has no steps and this one does. */
  other: boolean;
};

/**
 * Which routine the card shows: the preferred one when it has steps, otherwise the other one (so someone with only a
 * morning routine still sees it in the evening), otherwise nothing.
 */
export function pickRoutine<T>(morning: readonly T[], evening: readonly T[], preferred: RoutinePart): RoutinePick<T> | null {
  const other: RoutinePart = preferred === 'morning' ? 'evening' : 'morning';
  const stepsOf = (part: RoutinePart) => (part === 'morning' ? morning : evening);
  if (stepsOf(preferred).length > 0) return { part: preferred, steps: [...stepsOf(preferred)], other: false };
  if (stepsOf(other).length > 0) return { part: other, steps: [...stepsOf(other)], other: true };
  return null;
}

/**
 * The first `max` steps and how many were left out. One step over the limit is shown too, because "+1 more" would not
 * save any room.
 */
export function previewOf<T>(items: readonly T[], max: number): { shown: T[]; more: number } {
  const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 1;
  if (items.length <= limit + 1) return { shown: [...items], more: 0 };
  return { shown: items.slice(0, limit), more: items.length - limit };
}
