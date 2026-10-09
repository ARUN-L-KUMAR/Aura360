import { CURRENCY_SYMBOL } from '@/lib/config';

export function formatMoney(value: number | string | null | undefined, options: { compact?: boolean } = {}) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${CURRENCY_SYMBOL}0`;

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (options.compact && abs >= 100_000) {
    // Indian shorthand: lakh / crore
    if (abs >= 10_000_000) return `${sign}${CURRENCY_SYMBOL}${(abs / 10_000_000).toFixed(2)}Cr`;
    return `${sign}${CURRENCY_SYMBOL}${(abs / 100_000).toFixed(2)}L`;
  }

  return `${sign}${CURRENCY_SYMBOL}${abs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** "2026-10-09" -> "9 Oct". Dates from the API are plain days, so parse without timezone shifts. */
export function formatDay(isoDay: string) {
  const [year, month, day] = isoDay.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return isoDay;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function weekdayShort(isoDay: string) {
  const [year, month, day] = isoDay.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "2026-10" for a date, in the phone's timezone. */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

/** "October 2026" */
export function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** "2026-10-09" for a date, in the phone's timezone. */
export function todayIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
