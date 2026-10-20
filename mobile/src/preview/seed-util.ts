/** Small helpers shared by the sample-data files. Everything is relative to today so the preview never looks stale. */

export function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const daysAgo = (n: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
};
export const isoDaysAgo = (n: number) => isoOf(daysAgo(n));
/** ISO timestamp for a day at a clock time (local), never later than now. */
export function stamp(iso: string, hour: number, minute = 0) {
  const at = new Date(`${iso}T${pad(hour)}:${pad(minute)}:00`);
  const now = new Date();
  return (at.getTime() > now.getTime() ? new Date(now.getTime() - 60_000) : at).toISOString();
}
export const monthOf = (iso: string) => iso.slice(0, 7);
export const round = (value: number, step: number) => Math.round(value / step) * step;

/** Seeded random helpers: the same "user" every run. */
export function makeRandom(seed: number) {
  const next = mulberry32(seed);
  return {
    next,
    chance: (p: number) => next() < p,
    between: (min: number, max: number, step = 1) => min + Math.floor(next() * ((max - min) / step + 1)) * step,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
}
