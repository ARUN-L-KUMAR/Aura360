/**
 * Pure helpers that turn the transactions the app already loaded into the numbers the Finance charts draw.
 * Nothing here is estimated: every figure is a sum of real rows. No React, no theme, so it runs under `node --test`.
 */

type Row = { type: string; category: string; amount: string | number; date: string };

const amountOf = (row: Pick<Row, 'amount'>) => {
  const n = Number(row.amount);
  return Number.isFinite(n) ? n : 0;
};

export type SpendSlice = {
  /** The stored category name, or `null` for the "everything else" slice that groups the small ones. */
  category: string | null;
  value: number;
};

/**
 * Expense totals per category, largest first. More than `maxSlices` categories: the smallest ones are folded into a
 * single trailing slice (`category: null`), so the legend stays short and the donut stays readable.
 */
export function spendByCategory(rows: readonly Pick<Row, 'type' | 'category' | 'amount'>[], maxSlices = 5): { slices: SpendSlice[]; total: number } {
  const sums = new Map<string, number>();
  for (const row of rows) {
    if (row.type !== 'expense') continue;
    const value = amountOf(row);
    if (value <= 0) continue;
    sums.set(row.category, (sums.get(row.category) ?? 0) + value);
  }
  const sorted = [...sums.entries()].map(([category, value]) => ({ category: category as string | null, value })).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, s) => sum + s.value, 0);
  const limit = Math.max(2, Math.floor(maxSlices));
  if (sorted.length <= limit) return { slices: sorted, total };
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1).reduce((sum, s) => sum + s.value, 0);
  return { slices: [...head, { category: null, value: rest }], total };
}

/** Expense per day of `month` ("2026-10") for days 1..`upToDay`. Index 0 is the first of the month. */
export function dailySpend(rows: readonly Pick<Row, 'type' | 'amount' | 'date'>[], month: string, upToDay: number): number[] {
  const days = Math.max(0, Math.floor(upToDay));
  const series = new Array<number>(days).fill(0);
  for (const row of rows) {
    if (row.type !== 'expense' || !row.date.startsWith(month)) continue;
    const day = Number(row.date.slice(8, 10));
    if (Number.isInteger(day) && day >= 1 && day <= days) series[day - 1] += amountOf(row);
  }
  return series;
}

export type DayGroup<T> = {
  date: string;
  items: T[];
  /** Money in minus money out for the day. Transfers move money between your own accounts, so they are left out. */
  net: number;
};

/** Groups rows that are already sorted by date into one group per calendar day, keeping their order. */
export function groupByDay<T extends Pick<Row, 'type' | 'amount' | 'date'>>(rows: readonly T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const row of rows) {
    const date = row.date.slice(0, 10);
    let group = groups[groups.length - 1];
    if (!group || group.date !== date) {
      group = { date, items: [], net: 0 };
      groups.push(group);
    }
    group.items.push(row);
    const value = amountOf(row);
    if (row.type === 'income') group.net += value;
    else if (row.type === 'expense' || row.type === 'investment') group.net -= value;
  }
  return groups;
}

/** Whole days left in `month` counting `now`'s day, or `null` when `month` is not the month `now` is in. */
export function daysLeftInMonth(month: string, now: Date): number | null {
  const [year, m] = month.split('-').map(Number);
  if (!year || !m || now.getFullYear() !== year || now.getMonth() + 1 !== m) return null;
  const lastDay = new Date(year, m, 0).getDate();
  return Math.max(0, lastDay - now.getDate() + 1);
}

/** Percent change from `previous` to `current`, rounded. `null` when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Where a budget stands, for choosing its ring look and wording. */
export function budgetLevel(budget: { isOverBudget: boolean; isNearLimit: boolean; percentage: number }): 'ok' | 'near' | 'over' {
  if (budget.isOverBudget || budget.percentage > 100) return 'over';
  if (budget.isNearLimit) return 'near';
  return 'ok';
}
