/**
 * Pure helpers for the Saved card on Home. No React, no React Native, no path aliases: runs under plain Node
 * (tests/home-saved-card.test.ts). Nothing here invents data: every figure is counted from the saved items.
 */

/** One week, the window of "added this week" (the same one the Saved screen counts). */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Stamped = { createdAt: string };
type Marked = Stamped & { isFavorite: boolean | null };

export type SavedSummary = {
  /** Everything that is saved. */
  total: number;
  /** Items marked as favourites. */
  favourites: number;
  /** Items added in the 7 days up to `now`. */
  thisWeek: number;
};

/** Milliseconds since 1970 of an item's `createdAt`, or NaN when the server sent something unreadable. */
const timeOf = (item: Stamped): number => new Date(item.createdAt).getTime();

/**
 * The three figures on the card. `now` comes from the caller (read once when the card mounts) so the count never calls
 * the clock while rendering. An item with an unreadable date is not counted as new.
 */
export function savedSummary(items: readonly Marked[], now: number): SavedSummary {
  const since = now - WEEK_MS;
  let favourites = 0;
  let thisWeek = 0;
  for (const item of items) {
    if (item.isFavorite) favourites += 1;
    if (timeOf(item) >= since) thisWeek += 1;
  }
  return { total: items.length, favourites, thisWeek };
}

/**
 * The newest `limit` items, newest first. The server lists favourites before everything else, so the order it sends
 * is not by date. Items with the same time, or with an unreadable date (those go last), keep the order they came in.
 */
export function latestSaved<T extends Stamped>(items: readonly T[], limit: number): T[] {
  const count = Math.max(0, Math.floor(limit));
  const rank = (time: number) => (Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time);
  return items
    .map((item, position) => ({ item, position, time: rank(timeOf(item)) }))
    .sort((a, b) => (a.time === b.time ? a.position - b.position : b.time - a.time))
    .slice(0, count)
    .map((entry) => entry.item);
}
