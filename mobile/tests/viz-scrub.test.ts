import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lastDays, netFlow, scrubIndex, seriesStats, tooltipStart } from '../src/components/viz/scrub.ts';

test('a touch maps to the nearest point and never leaves the series', () => {
  // 5 points across 100 with 10 padding each side: x = 10, 30, 50, 70, 90
  assert.equal(scrubIndex(10, 100, 5, 10), 0);
  assert.equal(scrubIndex(29, 100, 5, 10), 1);
  assert.equal(scrubIndex(50, 100, 5, 10), 2);
  assert.equal(scrubIndex(91, 100, 5, 10), 4);
  assert.equal(scrubIndex(-40, 100, 5, 10), 0);
  assert.equal(scrubIndex(400, 100, 5, 10), 4);
});

test('degenerate scrub input is index 0', () => {
  assert.equal(scrubIndex(50, 100, 0), 0);
  assert.equal(scrubIndex(50, 100, 1), 0);
  assert.equal(scrubIndex(50, 0, 5), 0);
  assert.equal(scrubIndex(50, 20, 5, 20), 0);
  assert.equal(scrubIndex(Number.NaN, 100, 5), 0);
});

test('the tooltip stays inside its box', () => {
  assert.equal(tooltipStart(50, 40, 200), 30);
  assert.equal(tooltipStart(5, 40, 200), 0);
  assert.equal(tooltipStart(195, 40, 200), 160);
  assert.equal(tooltipStart(50, 300, 200), 0);
});

test('series stats find the peak day and the average', () => {
  assert.deepEqual(seriesStats([100, 0, 400, 400, 100]), { peak: 400, peakIndex: 2, total: 1000, average: 200 });
  assert.deepEqual(seriesStats([]), { peak: 0, peakIndex: -1, total: 0, average: 0 });
  assert.deepEqual(seriesStats([0, 0]), { peak: 0, peakIndex: 0, total: 0, average: 0 });
});

test('lastDays keeps the tail and says where it starts', () => {
  assert.deepEqual(lastDays([1, 2, 3, 4, 5], 2), { values: [4, 5], offset: 3 });
  assert.deepEqual(lastDays([1, 2], 7), { values: [1, 2], offset: 0 });
  assert.deepEqual(lastDays([1, 2], 0), { values: [], offset: 2 });
});

test('net flow has a direction', () => {
  assert.deepEqual(netFlow(85000, 35038), { amount: 49962, direction: 'up' });
  assert.deepEqual(netFlow(100, 250), { amount: -150, direction: 'down' });
  assert.deepEqual(netFlow(100, 100), { amount: 0, direction: 'flat' });
});
