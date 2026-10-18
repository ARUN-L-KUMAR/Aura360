import type { Meal } from '../../features/food/types.ts';

/** What one 7-day window of the food log adds up to. Averages are per day that has something logged. */
export type WeekWindow = { days: number; meals: number; calories: number; protein: number; averageCalories: number; averageProtein: number };

const pad = (n: number) => String(n).padStart(2, '0');

function isoOf(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day `delta` days from `isoDay` ("2026-10-31", 1 gives "2026-11-01"). */
export function shiftIsoDay(isoDay: string, delta: number) {
  const [year, month, day] = isoDay.split('-').map(Number);
  return isoOf(new Date(year, month - 1, day + delta));
}

export function summarizeMeals(meals: Meal[], from: string, to: string): WeekWindow {
  const days = new Set<string>();
  let count = 0;
  let calories = 0;
  let protein = 0;
  for (const meal of meals) {
    const day = meal.date.slice(0, 10);
    if (day < from || day > to) continue;
    days.add(day);
    count += 1;
    calories += Number(meal.calories) || 0;
    protein += Number(meal.protein) || 0;
  }
  const n = days.size;
  return { days: n, meals: count, calories, protein, averageCalories: n > 0 ? Math.round(calories / n) : 0, averageProtein: n > 0 ? Math.round(protein / n) : 0 };
}

/**
 * The last 7 days (today included) next to the 7 days before them. Rolling windows compare like with like, so a trend is
 * never drawn from a half week.
 */
export function weekStats(meals: Meal[], today: string): { before: WeekWindow; latest: WeekWindow } {
  return {
    latest: summarizeMeals(meals, shiftIsoDay(today, -6), today),
    before: summarizeMeals(meals, shiftIsoDay(today, -13), shiftIsoDay(today, -7)),
  };
}

/** Whole-number percent change, or null when there is nothing earlier to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!(previous > 0) || !Number.isFinite(current)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export const directionOf = (change: number): 'up' | 'down' | 'flat' => (change > 0 ? 'up' : change < 0 ? 'down' : 'flat');
