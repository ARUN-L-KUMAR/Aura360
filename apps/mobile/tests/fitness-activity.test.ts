import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, currentStreak, lastDays, percentChange, personalBests, rollingWeeks, weekMinutes } from '../src/components/fitness/activity.ts';

// Friday 9 October 2026 (local time).
const today = new Date(2026, 9, 9, 15, 30);

test('addDays crosses month and year ends', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('weekMinutes lays the current week out Monday first', () => {
  const minutes = weekMinutes(
    [
      { date: '2026-10-05', minutes: 40, volume: 0 },
      { date: '2026-10-05', minutes: 20, volume: 0 },
      { date: '2026-10-09', minutes: 30, volume: 0 },
      { date: '2026-10-04', minutes: 99, volume: 0 }, // last Sunday: not this week
    ],
    today,
  );
  assert.deepEqual(minutes, [60, 0, 0, 0, 30, 0, 0]);
});

test('currentStreak counts back from today, or from yesterday while today is still open', () => {
  assert.equal(currentStreak(new Set(['2026-10-09', '2026-10-08', '2026-10-07', '2026-10-05']), today), 3);
  assert.equal(currentStreak(new Set(['2026-10-08', '2026-10-07']), today), 2);
  assert.equal(currentStreak(new Set(['2026-10-06']), today), 0);
  assert.equal(currentStreak(new Set(), today), 0);
});

test('lastDays ends today and marks the days with a workout', () => {
  const days = lastDays(new Set(['2026-10-09', '2026-10-07']), 4, today);
  assert.deepEqual(days, [
    { iso: '2026-10-06', done: false },
    { iso: '2026-10-07', done: true },
    { iso: '2026-10-08', done: false },
    { iso: '2026-10-09', done: true },
  ]);
});

test('rollingWeeks puts the last 7 days in the final window', () => {
  const weeks = rollingWeeks(
    [
      { date: '2026-10-09', minutes: 30, volume: 1000 },
      { date: '2026-10-03', minutes: 20, volume: 500 }, // 6 days ago: still the last window
      { date: '2026-10-02', minutes: 10, volume: 200 }, // 7 days ago: the window before
      { date: '2026-08-01', minutes: 99, volume: 99 }, // outside 3 windows
    ],
    3,
    today,
  );
  assert.equal(weeks.length, 3);
  assert.deepEqual(weeks[2], { minutes: 50, volume: 1500, sessions: 2 });
  assert.deepEqual(weeks[1], { minutes: 10, volume: 200, sessions: 1 });
  assert.deepEqual(weeks[0], { minutes: 0, volume: 0, sessions: 0 });
});

test('rollingWeeks ignores bad numbers', () => {
  const [week] = rollingWeeks([{ date: '2026-10-09', minutes: Number.NaN, volume: -5 }], 1, today);
  assert.deepEqual(week, { minutes: 0, volume: 0, sessions: 1 });
});

test('percentChange needs something to compare with', () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
});

test('personalBests finds the heaviest lift and flags a fresh record', () => {
  const bests = personalBests([
    { name: 'Bench Press', date: '2026-10-09', weight: 82.5, reps: 5 },
    { name: 'bench press', date: '2026-10-02', weight: 80, reps: 5 },
    { name: 'Bench Press', date: '2026-09-25', weight: 77.5, reps: 8 },
    { name: 'Squat', date: '2026-10-05', weight: 120, reps: 3 },
    { name: 'Squat', date: '2026-09-28', weight: 125, reps: 3 },
    { name: 'Plank', date: '2026-10-05', weight: 0, reps: 1 },
  ]);
  assert.deepEqual(
    bests.map((b) => b.name),
    ['Bench Press', 'Squat'],
  );
  assert.deepEqual(bests[0].series, [77.5, 80, 82.5]);
  assert.equal(bests[0].weight, 82.5);
  assert.equal(bests[0].isNew, true);
  assert.equal(bests[1].weight, 125);
  assert.equal(bests[1].isNew, false);
});

test('personalBests does not flag a single session as a record', () => {
  const [only] = personalBests([{ name: 'Row', date: '2026-10-09', weight: 60, reps: 8 }]);
  assert.equal(only.isNew, false);
  assert.deepEqual(only.series, [60]);
});
