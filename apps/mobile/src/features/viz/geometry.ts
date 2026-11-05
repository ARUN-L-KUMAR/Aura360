/**
 * Pure geometry for the visualisation kit (rings, donuts, sparklines, bars). No React Native imports, so it runs
 * under node:test (see tests/viz-geometry.test.ts) and every function is total: empty, single-value, flat, negative,
 * NaN / Infinity and huge inputs all produce finite numbers, never NaN.
 *
 * Conventions
 *  - Angles are degrees measured clockwise from 12 o'clock (the way a ring fills).
 *  - Fractions are 0..1; a ring may reach 2 (two laps).
 *  - Paths use absolute SVG commands with numbers rounded to 2 decimals.
 */

export type Point = { x: number; y: number };

const EPSILON = 1e-9;

/** True for a real, finite number (not NaN, +-Infinity, or a non-number). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Drops everything that is not a finite number. Use for series where a missing point should not draw. */
export function cleanSeries(values: readonly unknown[] | null | undefined): number[] {
  if (!values) return [];
  return values.filter(isFiniteNumber);
}

/** Keeps the length: anything not finite or below zero becomes 0. Use for bars and segments where position matters. */
export function nonNegative(values: readonly unknown[] | null | undefined): number[] {
  if (!values) return [];
  return values.map((v) => (isFiniteNumber(v) && v > 0 ? v : 0));
}

export const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);

/** Rounds to 2 decimals and never returns -0 (which would print as "-0" in a path). */
export function round2(value: number): number {
  const v = Math.round(value * 100) / 100;
  return v === 0 ? 0 : v;
}

// ---------------------------------------------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------------------------------------------

/** Smallest "nice" number (1, 2, 2.5, 5 or 10 times a power of ten) that is >= value. Non-positive or invalid input gives 1. */
export function niceMax(value: number): number {
  if (!isFiniteNumber(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const fraction = value / base;
  const step = [1, 2, 2.5, 5, 10].find((s) => fraction <= s + EPSILON) ?? 10;
  const result = step * base;
  return Number.isFinite(result) ? result : value;
}

export function extent(values: readonly number[]): { min: number; max: number } | null {
  if (values.length === 0) return null;
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/**
 * Maps values onto 0..1. A flat series (all equal, or a single value) has no range, so every point sits on the
 * middle line (0.5) rather than dividing by zero. An explicit `min` / `max` clamps the result to 0..1. Ranges that
 * would overflow (values near +-Number.MAX_VALUE) are halved first.
 */
export function normalise(values: readonly number[], domain: { min?: number; max?: number } = {}): number[] {
  const series = cleanSeries(values);
  if (series.length === 0) return [];
  const found = extent(series) as { min: number; max: number };
  const min = isFiniteNumber(domain.min) ? domain.min : found.min;
  const max = isFiniteNumber(domain.max) ? domain.max : found.max;
  const range = max - min;
  if (Number.isFinite(range) && range < EPSILON) return series.map(() => 0.5);
  const scale = (v: number) => (Number.isFinite(range) ? (v - min) / range : (v / 2 - min / 2) / (max / 2 - min / 2));
  return series.map((v) => clamp(scale(v), 0, 1));
}

/**
 * Chart points for a series, evenly spaced across `width`, inverted so larger values are higher. One point sits in
 * the horizontal centre. `padX` / `padY` keep strokes and end dots inside the box.
 */
export function seriesPoints(
  values: readonly number[],
  box: { width: number; height: number; padX?: number; padY?: number; min?: number; max?: number },
): Point[] {
  const series = cleanSeries(values);
  if (series.length === 0) return [];
  const padX = Math.max(0, box.padX ?? 0);
  const padY = Math.max(0, box.padY ?? 0);
  const innerW = Math.max(0, box.width - padX * 2);
  const innerH = Math.max(0, box.height - padY * 2);
  const unit = normalise(series, { min: box.min, max: box.max });
  return unit.map((n, i) => ({
    x: round2(series.length === 1 ? padX + innerW / 2 : padX + (innerW * i) / (series.length - 1)),
    y: round2(padY + (1 - n) * innerH),
  }));
}

/** Y of the zero line for a series box, or null when zero is outside the series range (no baseline to draw). */
export function zeroLineY(
  values: readonly number[],
  box: { height: number; padY?: number },
): number | null {
  const series = cleanSeries(values);
  const found = extent(series);
  if (!found || found.min >= 0 || found.max <= 0) return null;
  const padY = Math.max(0, box.padY ?? 0);
  const innerH = Math.max(0, box.height - padY * 2);
  const n = normalise([found.min, 0, found.max])[1];
  return round2(padY + (1 - n) * innerH);
}

export type Trend = { direction: 'up' | 'down' | 'flat'; change: number; percent: number | null };

/** First-to-last movement of a series. `percent` is null when the first value is 0 (no meaningful base). */
export function trendOf(values: readonly number[]): Trend {
  const series = cleanSeries(values);
  if (series.length < 2) return { direction: 'flat', change: 0, percent: null };
  const first = series[0];
  const last = series[series.length - 1];
  const change = last - first;
  const direction = Math.abs(change) < EPSILON ? 'flat' : change > 0 ? 'up' : 'down';
  const percent = first === 0 || !Number.isFinite(change / first) ? null : round2((change / Math.abs(first)) * 100);
  return { direction, change, percent };
}

// ---------------------------------------------------------------------------------------------------------------
// Smooth lines
// ---------------------------------------------------------------------------------------------------------------

export type CubicSegment = { c1: Point; c2: Point; to: Point };

/**
 * Monotone cubic (Fritsch-Carlson) segments through the points. The curve never overshoots the data: between two
 * points it stays within their y range, so a sparkline cannot dip below zero or spike above the peak. Points must be
 * in x order; a segment of zero width falls back to a straight line.
 */
export function smoothSegments(points: readonly Point[]): CubicSegment[] {
  const n = points.length;
  if (n < 2) return [];
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const w = points[i + 1].x - points[i].x;
    dx.push(w);
    slope.push(w > EPSILON ? (points[i + 1].y - points[i].y) / w : 0);
  }
  const tangent: number[] = new Array(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < EPSILON) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      tangent[i] = tau * a * slope[i];
      tangent[i + 1] = tau * b * slope[i];
    }
  }
  return dx.map((w, i) => {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (w <= EPSILON) return { c1: p0, c2: p1, to: p1 };
    return {
      c1: { x: p0.x + w / 3, y: p0.y + (tangent[i] * w) / 3 },
      c2: { x: p1.x - w / 3, y: p1.y - (tangent[i + 1] * w) / 3 },
      to: p1,
    };
  });
}

const fmt = (p: Point) => `${round2(p.x)} ${round2(p.y)}`;

/** SVG path for a smooth line through the points. '' for none, a lone moveto for one, a straight line for two. */
export function smoothLinePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const start = `M${fmt(points[0])}`;
  if (points.length === 1) return start;
  if (points.length === 2) return `${start}L${fmt(points[1])}`;
  return start + smoothSegments(points).map((s) => `C${fmt(s.c1)} ${fmt(s.c2)} ${fmt(s.to)}`).join('');
}

/** The smooth line closed down to `baselineY`, for the soft fill under a sparkline. '' for fewer than two points. */
export function areaPath(points: readonly Point[], baselineY: number): string {
  if (points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const base = round2(baselineY);
  return `${smoothLinePath(points)}L${round2(last.x)} ${base}L${round2(first.x)} ${base}Z`;
}

/**
 * Upper bound for the drawn length of `smoothLinePath` (the length of its control polygon). A dash pattern of this
 * length hides the whole line, so animating the offset from this value to 0 draws it on.
 */
export function pathLengthBound(points: readonly Point[]): number {
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  if (points.length < 2) return 0;
  if (points.length === 2) return dist(points[0], points[1]);
  let total = 0;
  let from = points[0];
  for (const s of smoothSegments(points)) {
    total += dist(from, s.c1) + dist(s.c1, s.c2) + dist(s.c2, s.to);
    from = s.to;
  }
  return total;
}

// ---------------------------------------------------------------------------------------------------------------
// Rings
// ---------------------------------------------------------------------------------------------------------------

/** A ring shows at most this many laps; anything beyond is just "a lot over". */
export const MAX_LAPS = 2;

export const circumferenceOf = (radius: number) => 2 * Math.PI * Math.max(0, radius);

/** Radius of a ring that fits a square of `size` with a stroke of `thickness` centred on the circle. */
export const ringRadius = (size: number, thickness: number) => Math.max(0, (size - thickness) / 2);

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Point on a circle; `degrees` clockwise from 12 o'clock. */
export function polarPoint(cx: number, cy: number, radius: number, degrees: number): Point {
  const a = toRadians(degrees - 90);
  return { x: round2(cx + radius * Math.cos(a)), y: round2(cy + radius * Math.sin(a)) };
}

/** value / max as a fraction in 0..MAX_LAPS. Invalid value, max <= 0 or negative value gives 0. */
export function ringFraction(value: number, max = 100): number {
  if (!isFiniteNumber(value) || !isFiniteNumber(max) || max <= 0 || value <= 0) return 0;
  return Math.min(MAX_LAPS, value / max);
}

export type RingLaps = {
  /** Total fraction, 0..2. */
  fraction: number;
  /** Fill of the first lap, 0..1. */
  first: number;
  /** Fill of the second lap, 0..1 (0 until the value passes the max). */
  second: number;
  over: boolean;
};

export function ringLaps(value: number, max = 100): RingLaps {
  const fraction = ringFraction(value, max);
  return { fraction, first: Math.min(fraction, 1), second: clamp(fraction - 1, 0, 1), over: fraction > 1 + EPSILON };
}

/** strokeDashoffset that shows `fraction` (0..1) of a circle drawn with `strokeDasharray={[c, c]}`. */
export const dashOffsetFor = (circumference: number, fraction: number) => circumference * (1 - clamp(fraction, 0, 1));

// ---------------------------------------------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------------------------------------------

export type DonutArc = {
  index: number;
  /** Share of the whole, 0..1. */
  fraction: number;
  /** Where the segment's slice begins and how wide it is, before gaps. */
  startDeg: number;
  sweepDeg: number;
  /** The painted part after trimming half a gap off each side. 0 for empty segments. */
  drawnStartDeg: number;
  drawnSweepDeg: number;
  /** strokeDasharray for a circle of the given radius (butt caps): [painted length, rest of the circle]. */
  dashArray: [number, number];
  /**
   * strokeDashoffset that moves the painted dash to the segment's position. Negative. Draw every segment as a full
   * circle in a view rotated -90deg (SVG circles start at 3 o'clock) and no per-circle rotation is needed.
   */
  dashOffset: number;
};

export type DonutOptions = {
  radius: number;
  /** Space between neighbouring segments, as arc length along the ring in points. Default 0. */
  gap?: number;
  /** Whole amount the ring represents (for example a budget). Segments sum to less leaves an empty remainder. Default: their sum. */
  total?: number;
};

/**
 * Segments of a donut. Negative, zero and non-finite values are empty (they keep their index but draw nothing).
 * When the values add up to more than `total` (or no total is given) they are scaled so they exactly fill the ring;
 * when they add up to less, the remainder stays empty. A segment never loses more than half of itself to gaps, so tiny
 * slices stay visible. One lone segment draws as a full ring with no gap.
 */
export function donutArcs(values: readonly number[], options: DonutOptions): DonutArc[] {
  const radius = Math.max(0, options.radius);
  const circ = circumferenceOf(radius);
  const clean = nonNegative(values);
  const sum = clean.reduce((a, b) => a + b, 0);
  const whole = isFiniteNumber(options.total) && options.total > sum ? options.total : sum;
  const visible = clean.filter((v) => v > 0).length;
  const hasRemainder = whole > 0 && sum < whole * (1 - EPSILON);
  const gapDeg = radius > 0 && (visible > 1 || (visible === 1 && hasRemainder)) ? (Math.max(0, options.gap ?? 0) / radius) * (180 / Math.PI) : 0;

  let cursor = 0;
  return clean.map((value, index) => {
    const fraction = whole > 0 && Number.isFinite(sum) ? value / whole : 0;
    const sweepDeg = fraction * 360;
    const startDeg = cursor;
    cursor += sweepDeg;
    const half = Math.min(gapDeg / 2, sweepDeg / 4);
    const drawnSweepDeg = value > 0 ? Math.max(0, sweepDeg - half * 2) : 0;
    const drawnStartDeg = startDeg + half;
    const length = (drawnSweepDeg / 360) * circ;
    return {
      index,
      fraction,
      startDeg,
      sweepDeg,
      drawnStartDeg,
      drawnSweepDeg,
      dashArray: [round2(length), round2(circ)],
      dashOffset: round2(-(drawnStartDeg / 360) * circ),
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Bars
// ---------------------------------------------------------------------------------------------------------------

export type BarRect = { index: number; x: number; y: number; width: number; height: number; fraction: number };

export type BarOptions = {
  width: number;
  height: number;
  /** Space between bars. Default 0. */
  gap?: number;
  /** Shortest a bar is drawn, so zero (and tiny) values still leave a visible stub. Default 0. */
  minHeight?: number;
  /** Value that fills the full height. Default: the largest value. */
  max?: number;
};

/**
 * Bars in a box, bottom-aligned. Negative and non-finite values count as 0. If every value is 0 all bars are stubs.
 * `fraction` is the unclamped share of the max (0..1) before `minHeight`.
 */
export function barLayout(values: readonly number[], options: BarOptions): BarRect[] {
  const clean = nonNegative(values);
  const count = clean.length;
  if (count === 0) return [];
  const gap = Math.max(0, options.gap ?? 0);
  const height = Math.max(0, options.height);
  const minHeight = clamp(options.minHeight ?? 0, 0, height);
  const barWidth = Math.max(0, (options.width - gap * (count - 1)) / count);
  const peak = isFiniteNumber(options.max) && options.max > 0 ? options.max : Math.max(...clean);
  return clean.map((value, index) => {
    const fraction = peak > 0 ? Math.min(1, value / peak) : 0;
    const h = Math.max(minHeight, fraction * height);
    return { index, x: round2(index * (barWidth + gap)), y: round2(height - h), width: round2(barWidth), height: round2(h), fraction };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Tweens (count-up numbers)
// ---------------------------------------------------------------------------------------------------------------

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** Value part-way from `from` to `to`; `progress` is eased 0..1. Invalid ends snap to `to` (or 0). */
export function tweenValue(from: number, to: number, progress: number): number {
  const end = isFiniteNumber(to) ? to : 0;
  const start = isFiniteNumber(from) ? from : end;
  const t = easeOutCubic(progress);
  return t >= 1 ? end : start + (end - start) * t;
}
