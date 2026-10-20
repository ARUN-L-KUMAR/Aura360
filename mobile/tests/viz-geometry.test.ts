import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  areaPath,
  barLayout,
  cleanSeries,
  dashOffsetFor,
  donutArcs,
  easeOutCubic,
  niceMax,
  nonNegative,
  normalise,
  pathLengthBound,
  polarPoint,
  ringFraction,
  ringLaps,
  ringRadius,
  seriesPoints,
  smoothLinePath,
  smoothSegments,
  trendOf,
  tweenValue,
  zeroLineY,
  type Point,
} from '../src/features/viz/geometry.ts';

const close = (actual: number, expected: number, epsilon = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);

const noBadNumbers = (text: string) => assert.ok(!/NaN|Infinity|undefined/.test(text), `bad number in "${text}"`);

// --- series cleaning and scales -------------------------------------------------------------------------------

test('cleanSeries drops NaN, Infinity and non-numbers but keeps zero and negatives', () => {
  assert.deepEqual(cleanSeries([1, Number.NaN, 2, Infinity, -Infinity, '3', null, undefined, 0, -4]), [1, 2, 0, -4]);
  assert.deepEqual(cleanSeries([]), []);
  assert.deepEqual(cleanSeries(null), []);
});

test('nonNegative keeps the length and zeroes anything invalid or negative', () => {
  assert.deepEqual(nonNegative([3, -1, Number.NaN, Infinity, 0, 2]), [3, 0, 0, 0, 0, 2]);
});

test('niceMax rounds up to 1, 2, 2.5, 5 or 10 times a power of ten', () => {
  assert.equal(niceMax(0.7), 1);
  assert.equal(niceMax(1), 1);
  assert.equal(niceMax(1.01), 2);
  assert.equal(niceMax(2.2), 2.5);
  assert.equal(niceMax(3), 5);
  assert.equal(niceMax(7), 10);
  assert.equal(niceMax(73), 100);
  assert.equal(niceMax(2300), 2500);
  assert.equal(niceMax(0.032), 0.05);
});

test('niceMax is safe for zero, negatives, NaN, Infinity and huge numbers', () => {
  for (const bad of [0, -5, Number.NaN, Infinity, -Infinity]) assert.equal(niceMax(bad), 1);
  const huge = niceMax(3.2e30);
  assert.ok(Number.isFinite(huge) && huge >= 3.2e30);
  const max = niceMax(Number.MAX_VALUE);
  assert.ok(Number.isFinite(max) && max >= Number.MAX_VALUE);
});

test('normalise maps min to 0 and max to 1', () => {
  assert.deepEqual(normalise([10, 20, 30]), [0, 0.5, 1]);
  assert.deepEqual(normalise([-10, 0, 10]), [0, 0.5, 1]);
});

test('normalise guards flat, single and empty series (no divide by zero)', () => {
  assert.deepEqual(normalise([]), []);
  assert.deepEqual(normalise([7]), [0.5]);
  assert.deepEqual(normalise([4, 4, 4]), [0.5, 0.5, 0.5]);
  assert.deepEqual(normalise([0, 0]), [0.5, 0.5]);
});

test('normalise filters NaN / Infinity and respects an explicit domain', () => {
  assert.deepEqual(normalise([0, Number.NaN, 10, Infinity]), [0, 1]);
  assert.deepEqual(normalise([5, 50, -5], { min: 0, max: 10 }), [0.5, 1, 0]);
});

test('normalise survives values near the float limits', () => {
  const out = normalise([-Number.MAX_VALUE, 0, Number.MAX_VALUE]);
  assert.equal(out.length, 3);
  for (const n of out) assert.ok(Number.isFinite(n) && n >= 0 && n <= 1);
  close(out[1], 0.5);
  const big = normalise([1e15, 2e15, 3e15]);
  close(big[1], 0.5);
});

test('seriesPoints inverts y, spaces x evenly and stays inside the padding', () => {
  const pts = seriesPoints([0, 5, 10], { width: 100, height: 40, padX: 4, padY: 4 });
  assert.deepEqual(pts, [
    { x: 4, y: 36 },
    { x: 50, y: 20 },
    { x: 96, y: 4 },
  ]);
});

test('seriesPoints: empty, single and flat series', () => {
  assert.deepEqual(seriesPoints([], { width: 100, height: 40 }), []);
  assert.deepEqual(seriesPoints([Number.NaN], { width: 100, height: 40 }), []);
  assert.deepEqual(seriesPoints([9], { width: 100, height: 40 }), [{ x: 50, y: 20 }]);
  const flat = seriesPoints([3, 3, 3], { width: 100, height: 40 });
  assert.deepEqual(
    flat.map((p) => p.y),
    [20, 20, 20],
  );
  assert.deepEqual(
    flat.map((p) => p.x),
    [0, 50, 100],
  );
});

test('seriesPoints handles a box smaller than its padding', () => {
  const pts = seriesPoints([1, 2, 3], { width: 4, height: 4, padX: 10, padY: 10 });
  for (const p of pts) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});

test('zeroLineY exists only when the series crosses zero', () => {
  assert.equal(zeroLineY([1, 2, 3], { height: 40 }), null);
  assert.equal(zeroLineY([-3, -1], { height: 40 }), null);
  assert.equal(zeroLineY([], { height: 40 }), null);
  const y = zeroLineY([-10, 10], { height: 40 });
  assert.equal(y, 20);
  const skewed = zeroLineY([-10, 30], { height: 40 }) as number;
  assert.equal(skewed, 30);
});

test('trendOf reports direction, change and percent', () => {
  assert.deepEqual(trendOf([100, 120]), { direction: 'up', change: 20, percent: 20 });
  assert.deepEqual(trendOf([200, 150]), { direction: 'down', change: -50, percent: -25 });
  assert.equal(trendOf([5, 5, 5]).direction, 'flat');
  assert.equal(trendOf([0, 5]).percent, null);
  assert.deepEqual(trendOf([]), { direction: 'flat', change: 0, percent: null });
  assert.equal(trendOf([1, Number.NaN, 2]).direction, 'up');
  assert.equal(trendOf([-100, -50]).percent, 50);
});

// --- smooth line and area -------------------------------------------------------------------------------------

test('smoothLinePath: none, one, two points', () => {
  assert.equal(smoothLinePath([]), '');
  assert.equal(smoothLinePath([{ x: 3, y: 4 }]), 'M3 4');
  assert.equal(
    smoothLinePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ]),
    'M0 10L10 0',
  );
});

test('smoothLinePath draws one cubic per gap and passes through every point', () => {
  const pts: Point[] = [
    { x: 0, y: 30 },
    { x: 25, y: 10 },
    { x: 50, y: 20 },
    { x: 75, y: 5 },
  ];
  const path = smoothLinePath(pts);
  assert.ok(path.startsWith('M0 30C'));
  assert.equal((path.match(/C/g) ?? []).length, 3);
  const segments = smoothSegments(pts);
  assert.deepEqual(
    segments.map((s) => s.to),
    pts.slice(1),
  );
  noBadNumbers(path);
});

test('smoothSegments is monotone: control points never overshoot the neighbouring data', () => {
  const pts: Point[] = [
    { x: 0, y: 50 },
    { x: 10, y: 50 },
    { x: 20, y: 0 },
    { x: 30, y: 0 },
    { x: 40, y: 40 },
    { x: 50, y: 5 },
  ];
  const segments = smoothSegments(pts);
  segments.forEach((s, i) => {
    const lo = Math.min(pts[i].y, pts[i + 1].y);
    const hi = Math.max(pts[i].y, pts[i + 1].y);
    for (const c of [s.c1, s.c2]) {
      assert.ok(c.y >= lo - 1e-6 && c.y <= hi + 1e-6, `segment ${i} control y ${c.y} outside ${lo}..${hi}`);
      assert.ok(c.x >= pts[i].x && c.x <= pts[i + 1].x);
    }
  });
});

test('smoothSegments keeps a flat run flat and tolerates zero-width segments', () => {
  const flat = smoothSegments([
    { x: 0, y: 5 },
    { x: 10, y: 5 },
    { x: 20, y: 5 },
  ]);
  for (const s of flat) {
    assert.equal(s.c1.y, 5);
    assert.equal(s.c2.y, 5);
  }
  const degenerate = smoothLinePath([
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
  ]);
  noBadNumbers(degenerate);
});

test('areaPath closes the line to the baseline and needs two points', () => {
  const pts: Point[] = [
    { x: 0, y: 10 },
    { x: 20, y: 5 },
  ];
  assert.equal(areaPath(pts, 40), 'M0 10L20 5L20 40L0 40Z');
  assert.equal(areaPath([{ x: 1, y: 1 }], 40), '');
  assert.equal(areaPath([], 40), '');
  const three = areaPath([...pts, { x: 40, y: 8 }], 40);
  assert.ok(three.endsWith('L40 40L0 40Z'));
});

test('pathLengthBound is at least the straight-line distance and at most the control polygon', () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 30, y: 40 },
    { x: 60, y: 0 },
  ];
  const bound = pathLengthBound(pts);
  const chord = Math.hypot(30, 40) * 2;
  assert.ok(bound >= chord - 1e-6, `${bound} < ${chord}`);
  assert.equal(pathLengthBound([]), 0);
  assert.equal(pathLengthBound([{ x: 0, y: 0 }]), 0);
  assert.equal(pathLengthBound(pts.slice(0, 2)), 50);
});

test('very large values still produce a finite path', () => {
  const pts = seriesPoints([1e300, 5e300, 2e300, 9e307], { width: 120, height: 40, padX: 3, padY: 3 });
  noBadNumbers(smoothLinePath(pts));
  noBadNumbers(areaPath(pts, 40));
  const negative = seriesPoints([-5, -1, -9, -3], { width: 120, height: 40 });
  for (const p of negative) assert.ok(p.y >= 0 && p.y <= 40);
});

// --- rings ----------------------------------------------------------------------------------------------------

test('ringFraction clamps to two laps and ignores invalid input', () => {
  assert.equal(ringFraction(50, 100), 0.5);
  assert.equal(ringFraction(100, 100), 1);
  assert.equal(ringFraction(150, 100), 1.5);
  assert.equal(ringFraction(900, 100), 2);
  assert.equal(ringFraction(-5, 100), 0);
  assert.equal(ringFraction(Number.NaN, 100), 0);
  assert.equal(ringFraction(Infinity, 100), 0);
  assert.equal(ringFraction(5, 0), 0);
  assert.equal(ringFraction(5, Number.NaN), 0);
  assert.equal(ringFraction(0.5, 1), 0.5);
});

test('ringLaps splits overshoot into a second lap', () => {
  assert.deepEqual(ringLaps(40, 100), { fraction: 0.4, first: 0.4, second: 0, over: false });
  assert.deepEqual(ringLaps(100, 100), { fraction: 1, first: 1, second: 0, over: false });
  const over = ringLaps(130, 100);
  close(over.first, 1, 1e-9);
  close(over.second, 0.3, 1e-9);
  assert.equal(over.over, true);
  assert.deepEqual(ringLaps(500, 100), { fraction: 2, first: 1, second: 1, over: true });
  assert.deepEqual(ringLaps(Number.NaN), { fraction: 0, first: 0, second: 0, over: false });
});

test('dashOffsetFor hides the whole ring at 0 and none of it at 1', () => {
  assert.equal(dashOffsetFor(200, 0), 200);
  assert.equal(dashOffsetFor(200, 1), 0);
  assert.equal(dashOffsetFor(200, 0.25), 150);
  assert.equal(dashOffsetFor(200, 3), 0);
  assert.equal(dashOffsetFor(200, -1), 200);
});

test('ringRadius fits the stroke inside the box', () => {
  assert.equal(ringRadius(100, 10), 45);
  assert.equal(ringRadius(8, 10), 0);
});

test('polarPoint measures clockwise from 12 o clock', () => {
  assert.deepEqual(polarPoint(50, 50, 40, 0), { x: 50, y: 10 });
  assert.deepEqual(polarPoint(50, 50, 40, 90), { x: 90, y: 50 });
  assert.deepEqual(polarPoint(50, 50, 40, 180), { x: 50, y: 90 });
  assert.deepEqual(polarPoint(50, 50, 40, 270), { x: 10, y: 50 });
});

// --- donut ----------------------------------------------------------------------------------------------------

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

test('donutArcs: fractions and angles for an ordinary breakdown', () => {
  const arcs = donutArcs([50, 30, 20], { radius: 40 });
  assert.deepEqual(
    arcs.map((a) => a.fraction),
    [0.5, 0.3, 0.2],
  );
  assert.deepEqual(
    arcs.map((a) => a.startDeg),
    [0, 180, 288],
  );
  close(sum(arcs.map((a) => a.sweepDeg)), 360, 1e-9);
  // No gap: the drawn arc is the full slice.
  assert.equal(arcs[0].drawnSweepDeg, 180);
  assert.equal(arcs[0].dashOffset, 0);
  close(arcs[1].dashOffset, -(2 * Math.PI * 40) / 2, 0.01);
});

test('donutArcs: values that do not add up to 100 are scaled to fill the ring', () => {
  const arcs = donutArcs([1, 1, 1], { radius: 40 });
  for (const a of arcs) close(a.fraction, 1 / 3, 1e-9);
  const big = donutArcs([30, 90], { radius: 40 });
  close(big[0].fraction, 0.25, 1e-9);
  close(sum(big.map((a) => a.fraction)), 1, 1e-9);
});

test('donutArcs: a total larger than the sum leaves an empty remainder', () => {
  const arcs = donutArcs([25, 25], { radius: 40, total: 200 });
  assert.deepEqual(
    arcs.map((a) => a.fraction),
    [0.125, 0.125],
  );
  close(sum(arcs.map((a) => a.sweepDeg)), 90, 1e-9);
  // A total smaller than the sum is ignored: the values still fill the ring exactly.
  const over = donutArcs([60, 60], { radius: 40, total: 100 });
  close(sum(over.map((a) => a.fraction)), 1, 1e-9);
});

test('donutArcs: gaps open between neighbours but never swallow small slices', () => {
  const radius = 40;
  const gap = 4;
  const gapDeg = (gap / radius) * (180 / Math.PI);
  const arcs = donutArcs([50, 50], { radius, gap });
  const end0 = arcs[0].drawnStartDeg + arcs[0].drawnSweepDeg;
  close(arcs[1].drawnStartDeg - end0, gapDeg, 1e-6);
  // And around the seam at 360.
  close(arcs[0].drawnStartDeg + 360 - (arcs[1].drawnStartDeg + arcs[1].drawnSweepDeg), gapDeg, 1e-6);

  const tiny = donutArcs([1000, 1], { radius, gap: 20 });
  assert.ok(tiny[1].drawnSweepDeg > 0);
  assert.ok(tiny[1].drawnSweepDeg >= tiny[1].sweepDeg / 2 - 1e-9);
});

test('donutArcs: a single segment is a full ring with no gap; a single partial one keeps its gap', () => {
  const lone = donutArcs([42], { radius: 40, gap: 6 });
  assert.equal(lone[0].fraction, 1);
  assert.equal(lone[0].drawnSweepDeg, 360);
  const partial = donutArcs([42], { radius: 40, gap: 6, total: 100 });
  assert.ok(partial[0].drawnSweepDeg < partial[0].sweepDeg);
});

test('donutArcs: dasharray length matches the painted angle', () => {
  const radius = 50;
  const circ = 2 * Math.PI * radius;
  const [arc] = donutArcs([1, 3], { radius });
  close(arc.dashArray[0], circ / 4, 0.01);
  close(arc.dashArray[1], circ, 0.01);
});

test('donutArcs: empty, zero, negative, NaN and Infinity', () => {
  assert.deepEqual(donutArcs([], { radius: 40 }), []);
  const zeros = donutArcs([0, 0], { radius: 40 });
  assert.deepEqual(
    zeros.map((a) => a.drawnSweepDeg),
    [0, 0],
  );
  const mixed = donutArcs([10, -5, Number.NaN, Infinity, 10], { radius: 40, gap: 2 });
  assert.equal(mixed.length, 5);
  assert.deepEqual(
    mixed.map((a) => a.drawnSweepDeg > 0),
    [true, false, false, false, true],
  );
  for (const a of mixed) {
    assert.ok(Number.isFinite(a.fraction) && Number.isFinite(a.dashArray[0]) && Number.isFinite(a.dashOffset));
  }
  const noRadius = donutArcs([1, 2], { radius: 0 });
  for (const a of noRadius) assert.ok(Number.isFinite(a.dashArray[0]));
});

test('donutArcs: very large numbers stay finite', () => {
  const arcs = donutArcs([1e300, 3e300], { radius: 40, gap: 2 });
  close(arcs[0].fraction, 0.25, 1e-9);
  const overflow = donutArcs([Number.MAX_VALUE, Number.MAX_VALUE], { radius: 40 });
  for (const a of overflow) assert.ok(Number.isFinite(a.fraction) && Number.isFinite(a.sweepDeg));
});

// --- bars -----------------------------------------------------------------------------------------------------

test('barLayout scales to the tallest bar and bottom-aligns', () => {
  const bars = barLayout([2, 4, 1], { width: 100, height: 40, gap: 5 });
  assert.equal(bars.length, 3);
  assert.equal(bars[1].height, 40);
  assert.equal(bars[1].y, 0);
  assert.equal(bars[0].height, 20);
  assert.equal(bars[0].y, 20);
  const barWidth = (100 - 10) / 3;
  close(bars[0].width, barWidth);
  close(bars[1].x, barWidth + 5);
  close(bars[2].x + bars[2].width, 100);
});

test('barLayout: empty, all zero and minHeight stubs', () => {
  assert.deepEqual(barLayout([], { width: 100, height: 40 }), []);
  const zeros = barLayout([0, 0, 0], { width: 90, height: 30, minHeight: 4 });
  assert.deepEqual(
    zeros.map((b) => b.height),
    [4, 4, 4],
  );
  assert.deepEqual(
    zeros.map((b) => b.fraction),
    [0, 0, 0],
  );
  const flat = barLayout([5, 5, 5], { width: 90, height: 30 });
  assert.deepEqual(
    flat.map((b) => b.height),
    [30, 30, 30],
  );
});

test('barLayout ignores negative, NaN and Infinity values and honours an explicit max', () => {
  const bars = barLayout([-3, Number.NaN, Infinity, 5], { width: 80, height: 20, minHeight: 2 });
  assert.deepEqual(
    bars.map((b) => b.height),
    [2, 2, 2, 20],
  );
  const capped = barLayout([5, 20], { width: 40, height: 10, max: 10 });
  assert.deepEqual(
    capped.map((b) => b.fraction),
    [0.5, 1],
  );
});

test('barLayout survives a box narrower than its gaps and huge values', () => {
  const squeezed = barLayout([1, 2, 3, 4], { width: 5, height: 10, gap: 10 });
  for (const b of squeezed) assert.ok(b.width >= 0 && Number.isFinite(b.x));
  const huge = barLayout([1e300, 5e300], { width: 20, height: 10 });
  close(huge[0].fraction, 0.2, 1e-9);
});

// --- tweens ---------------------------------------------------------------------------------------------------

test('easeOutCubic starts at 0, ends at 1 and front-loads the change', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);
  assert.equal(easeOutCubic(2), 1);
  assert.equal(easeOutCubic(-1), 0);
});

test('tweenValue lands exactly on the target and survives bad ends', () => {
  assert.equal(tweenValue(0, 100, 0), 0);
  assert.equal(tweenValue(0, 100, 1), 100);
  assert.equal(tweenValue(100, 0, 1), 0);
  assert.ok(tweenValue(0, 100, 0.5) > 50);
  assert.equal(tweenValue(Number.NaN, 40, 0.3), 40);
  assert.equal(tweenValue(10, Number.NaN, 1), 0);
});
