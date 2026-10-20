/**
 * Pure maths for a scrubbable line chart. No React Native and no path aliases, so it runs under node:test
 * (see tests/viz-scrub.test.ts). Every function is total: empty, single-value and invalid input give safe numbers.
 */

/** Index of the data point nearest to a touch at `x`, for points spread evenly across `width` with `padX` on both sides. */
export function scrubIndex(x: number, width: number, count: number, padX = 0): number {
  if (!Number.isFinite(count) || count <= 1) return 0;
  const last = Math.floor(count) - 1;
  const inner = width - padX * 2;
  if (!Number.isFinite(x) || !Number.isFinite(inner) || inner <= 0) return 0;
  const unit = (x - padX) / inner;
  return Math.min(last, Math.max(0, Math.round(unit * last)));
}

/** Clamp for a tooltip centred on `centerX`: its start offset, kept inside a box of `boxWidth`. */
export function tooltipStart(centerX: number, tooltipWidth: number, boxWidth: number): number {
  const room = Math.max(0, boxWidth - tooltipWidth);
  return Math.min(room, Math.max(0, centerX - tooltipWidth / 2));
}

export type SeriesStats = {
  /** Highest value (0 for an empty series). */
  peak: number;
  /** Index of the first highest value, or -1 for an empty series. */
  peakIndex: number;
  total: number;
  /** total / count, 0 for an empty series. */
  average: number;
};

export function seriesStats(values: readonly number[]): SeriesStats {
  let peak = 0;
  let peakIndex = -1;
  let total = 0;
  values.forEach((v, i) => {
    const n = Number.isFinite(v) ? v : 0;
    total += n;
    if (peakIndex === -1 || n > peak) {
      peak = n;
      peakIndex = i;
    }
  });
  return { peak, peakIndex, total, average: values.length > 0 ? total / values.length : 0 };
}

/** The last `days` values of a series and the index (in the full series) of the first one kept. */
export function lastDays<T>(values: readonly T[], days: number): { values: T[]; offset: number } {
  const keep = Math.max(0, Math.floor(Number.isFinite(days) ? days : 0));
  const offset = Math.max(0, values.length - keep);
  return { values: values.slice(offset), offset };
}

/** Net flow of a month: positive means more came in than went out. */
export function netFlow(income: number, expense: number): { amount: number; direction: 'up' | 'down' | 'flat' } {
  const amount = (Number.isFinite(income) ? income : 0) - (Number.isFinite(expense) ? expense : 0);
  return { amount, direction: Math.abs(amount) < 0.005 ? 'flat' : amount > 0 ? 'up' : 'down' };
}
