import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  activitySeries,
  dayDelta,
  firstNameOf,
  initialOf,
  netOf,
  sharePercent,
  streakOf,
  timeOfDay,
  todayIndexOf,
  totalEntries,
} from '../src/components/home/derive.ts';

const at = (hour: number) => new Date(2026, 9, 17, hour, 30);

test('timeOfDay follows the local hour', () => {
  assert.equal(timeOfDay(at(4)), 'night');
  assert.equal(timeOfDay(at(5)), 'morning');
  assert.equal(timeOfDay(at(10)), 'morning');
  assert.equal(timeOfDay(at(11)), 'day');
  assert.equal(timeOfDay(at(16)), 'day');
  assert.equal(timeOfDay(at(17)), 'evening');
  assert.equal(timeOfDay(at(19)), 'evening');
  assert.equal(timeOfDay(at(20)), 'night');
  assert.equal(timeOfDay(at(0)), 'night');
});

test('activitySeries cleans bad numbers', () => {
  assert.deepEqual(
    activitySeries([
      { date: '2026-10-16', activities: 3 },
      { date: '2026-10-17', activities: Number.NaN },
    ]),
    [3, 0],
  );
});

test('todayIndexOf finds the date, else the last point', () => {
  const chart = [
    { date: '2026-10-16', activities: 1 },
    { date: '2026-10-17', activities: 2 },
    { date: '2026-10-18', activities: 0 },
  ];
  assert.equal(todayIndexOf(chart, '2026-10-17'), 1);
  assert.equal(todayIndexOf(chart, '2030-01-01'), 2);
  assert.equal(todayIndexOf([], '2026-10-17'), -1);
});

test('streakOf counts back from today, or from yesterday while today is still quiet', () => {
  assert.equal(streakOf([0, 1, 2, 3], 3), 3);
  assert.equal(streakOf([1, 1, 1, 0], 3), 3);
  assert.equal(streakOf([1, 0, 1, 1], 3), 2);
  assert.equal(streakOf([1, 1, 0, 0], 3), 0);
  assert.equal(streakOf([2, 2, 2, 2, 2, 2, 2], 6), 7);
  assert.equal(streakOf([], 0), 0);
  assert.equal(streakOf([1], -1), 0);
});

test('dayDelta compares today with yesterday', () => {
  assert.deepEqual(dayDelta([1, 4], 1), { direction: 'up', amount: 3 });
  assert.deepEqual(dayDelta([4, 1], 1), { direction: 'down', amount: 3 });
  assert.deepEqual(dayDelta([2, 2], 1), { direction: 'flat', amount: 0 });
  assert.equal(dayDelta([2], 0), null);
});

test('sharePercent and totalEntries never divide by zero', () => {
  assert.equal(sharePercent(1, 4), 25);
  assert.equal(sharePercent(5, 0), 0);
  assert.equal(sharePercent(9, 3), 100);
  assert.equal(totalEntries({ a: 2, b: 3, c: Number.NaN }), 5);
  assert.equal(totalEntries({}), 0);
});

test('netOf is income minus spending', () => {
  assert.equal(netOf({ income: 1000, expense: 400 }), 600);
  assert.equal(netOf({ income: 0, expense: 50 }), -50);
  assert.equal(netOf({ income: Number.NaN, expense: 10 }), -10);
});

test('initialOf and firstNameOf handle blanks', () => {
  assert.equal(initialOf('mon'), 'M');
  assert.equal(initialOf('  '), '');
  assert.equal(firstNameOf('Asha Rao'), 'Asha');
  assert.equal(firstNameOf(null), '');
  assert.equal(firstNameOf('   '), '');
});
