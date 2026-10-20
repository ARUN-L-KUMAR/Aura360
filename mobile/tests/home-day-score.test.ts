import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayScore } from '../src/components/home/today.ts';

const base = { calories: 1100, calorieTarget: 2200, minutesWeek: 150, weeklyGoalMinutes: 150, budget: 80 };

test('the score averages calories, minutes and budget, each capped at 100', () => {
  const score = dayScore(base);
  assert.equal(score.total, 3);
  assert.equal(score.closed, 1);
  assert.equal(score.percent, Math.round((50 + 100 + 80) / 3));
  assert.equal(dayScore({ ...base, minutesWeek: 900 }).percent, score.percent);
});

test('without a budget only the other two goals count', () => {
  const score = dayScore({ ...base, budget: null });
  assert.equal(score.total, 2);
  assert.equal(score.percent, 75);
});

test('goals switch individual parts off', () => {
  assert.deepEqual(dayScore({ ...base, goals: { calories: true, move: false, budget: false } }), { percent: 50, closed: 0, total: 1 });
  assert.deepEqual(dayScore({ ...base, goals: { calories: false, move: true, budget: true } }), { percent: 90, closed: 1, total: 2 });
});

test('a budget goal without a budget set does not count', () => {
  assert.equal(dayScore({ ...base, budget: null, goals: { calories: false, move: false, budget: true } }).total, 0);
});

test('no goals at all scores zero instead of dividing by zero', () => {
  assert.deepEqual(dayScore({ ...base, goals: { calories: false, move: false, budget: false } }), { percent: 0, closed: 0, total: 0 });
});
