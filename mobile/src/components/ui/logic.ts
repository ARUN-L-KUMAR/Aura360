/**
 * Pure helpers shared by the UI library. No React, no React Native, no path aliases: this file runs under plain Node
 * so `tests/ui-logic.test.ts` can cover it. Components import it as `@/components/ui/logic`.
 */

// ---------------------------------------------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------------------------------------------

/** "7", "99", then "99+" once `count` is above `max`. Fractions are floored; negatives and NaN read as 0. */
export function capCount(count: number, max = 99): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return n > max ? `${max}+` : String(n);
}

// ---------------------------------------------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------------------------------------------

/** Up to two upper-case initials: first letter of the first and last word. "" for a blank name. */
export function initialsOf(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Stable non-negative 32-bit string hash, so the same name always gets the same colour. */
export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------------------------------------------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------------------------------------------

/** Expands "#rgb" to "#rrggbb"; returns null for anything that is not a 3 or 6 digit hex colour. */
export function normalizeHex(color: string): string | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const body = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  return `#${body.toLowerCase()}`;
}

/**
 * Adds an alpha channel to a 6-digit hex colour. Anything else (rgba(), named colours, #rgb) is returned unchanged.
 * Only for legacy call sites that still pass a raw colour (`glowColor`, `color`); prefer `accent` tokens.
 */
export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const a = Math.round(Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

/** WCAG relative luminance (0-1) of a #rgb / #rrggbb colour, or null for anything else. */
export function luminance(color: string): number | null {
  const hex = normalizeHex(color);
  if (!hex) return null;
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG contrast ratio (1-21) between two hex colours, or null when either is not a hex colour. */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Picks the more readable of a light and a dark foreground for a filled background. Non-hex colours get `light`. */
export function readableOn(background: string, light: string, dark: string): string {
  const l = luminance(background);
  if (l === null) return light;
  const vsLight = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / ((luminance(dark) ?? 0) + 0.05);
  return vsDark > vsLight ? dark : light;
}

// ---------------------------------------------------------------------------------------------------------------
// Bottom sheet snap points
// ---------------------------------------------------------------------------------------------------------------

/** A pixel height, or a percentage of the screen height. */
export type SnapPoint = number | `${number}%`;

/** Pixel height of a snap point. Percentages are of `screenHeight`. Unparseable values read as 0. */
export function snapToPixels(point: SnapPoint, screenHeight: number): number {
  const px = typeof point === 'number' ? point : (parseFloat(point) / 100) * screenHeight;
  return Number.isFinite(px) ? px : 0;
}

/** Visible heights a sheet can rest at: clamped to `[0, maxHeight]`, de-duplicated, smallest first. */
export function resolveSnapHeights(points: readonly SnapPoint[], screenHeight: number, maxHeight: number): number[] {
  const px = points.map((p) => Math.min(maxHeight, Math.max(0, snapToPixels(p, screenHeight))));
  return Array.from(new Set(px)).sort((a, b) => a - b);
}

/** translateY of each snap (top-most first, which means the tallest visible height first). */
export function snapOffsets(heights: readonly number[], sheetHeight: number): number[] {
  return [...heights].reverse().map((h) => sheetHeight - h);
}

/** Keeps a snap index inside `[0, count - 1]`. */
export function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(0, index), Math.max(0, count - 1));
}

/**
 * Where a released drag lands. `projected` is the sheet's translateY plus its velocity carried forward; `offsets` are
 * the snap translateYs (top-most first); `hiddenY` is the translateY at which the sheet is fully off screen.
 * Returns the index into `offsets`, or -1 when the sheet should be dismissed (`dismissible` and the projection is
 * closer to hidden than to any snap).
 *
 * Runs inside a gesture worklet, hence the directive.
 */
export function pickSnap(projected: number, offsets: readonly number[], hiddenY: number, dismissible: boolean): number {
  'worklet';
  let best = 0;
  let bestDistance = Math.abs(projected - offsets[0]);
  for (let i = 1; i < offsets.length; i++) {
    const d = Math.abs(projected - offsets[i]);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  if (dismissible && Math.abs(projected - hiddenY) < bestDistance) return -1;
  return best;
}

// ---------------------------------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------------------------------

export type ErrorKind = 'generic' | 'network' | 'timeout' | 'sessionExpired' | 'notFound';

/** What `errorKindFromError` reads from a thrown value, so the mapping can be tested without `ApiError`. */
export type ErrorFacts = {
  /** HTTP status of an API error; 0 means the server could not be reached. Undefined for non-API errors. */
  status?: number;
  /** An API error whose request timed out (`data.timeout`). */
  timeout?: boolean;
  /** `Error.name` of a plain error. */
  name?: string;
  /** `Error.message` of a plain error. */
  message?: string;
};

const NETWORK_MESSAGE = /network request failed|failed to fetch|network error|offline/i;

/** Maps what we know about a failure to the `ErrorState` kind that explains it best. */
export function classifyError({ status, timeout, name, message }: ErrorFacts): ErrorKind {
  if (typeof status === 'number') {
    if (status === 0) return timeout ? 'timeout' : 'network';
    if (status === 401) return 'sessionExpired';
    if (status === 404) return 'notFound';
    if (status === 408 || status === 504) return 'timeout';
    return 'generic';
  }
  if (name === 'AbortError') return 'timeout';
  if (message && NETWORK_MESSAGE.test(message)) return 'network';
  return 'generic';
}

// ---------------------------------------------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------------------------------------------

export type ProgressLevel = 'normal' | 'near' | 'over';

/** Threshold level for a budget-style bar: `near` from 80%, `over` from 100%. Always `normal` when not automatic. */
export function progressLevel(percent: number, automatic: boolean): ProgressLevel {
  if (!automatic || !Number.isFinite(percent)) return 'normal';
  if (percent >= 100) return 'over';
  if (percent >= 80) return 'near';
  return 'normal';
}

/** The bar is drawn between 0 and 100 whatever the real number is. */
export function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
}
