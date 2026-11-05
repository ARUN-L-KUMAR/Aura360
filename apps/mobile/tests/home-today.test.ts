import assert from 'node:assert/strict';
import { test } from 'node:test';

import { budgetPercent, fractionOf, nextActions, percentOf, splitMinutes, type TodayInput } from '../src/components/home/today.ts';

const quiet: TodayInput = {
  food: { meals: 0 },
  fitness: { minutesWeek: 0, workoutsToday: 0 },
  time: { minutesToday: 0 },
  finance: { spentToday: 0, budgetTotal: 0, budgetSpent: 0, budgetCount: 0 },
};
const options = { hour: 12, timerRunning: false, weeklyGoalMinutes: 150 };

test('fractionOf handles missing goals and bad numbers', () => {
  assert.equal(fractionOf(50, 100), 0.5);
  assert.equal(fractionOf(150, 100), 1.5);
  assert.equal(fractionOf(10, 0), 0);
  assert.equal(fractionOf(-5, 100), 0);
  assert.equal(fractionOf(Number.NaN, 100), 0);
});

test('percentOf rounds and is not capped', () => {
  assert.equal(percentOf(1, 3), 33);
  assert.equal(percentOf(110, 100), 110);
});

test('budgetPercent is null without a budget', () => {
  assert.equal(budgetPercent({ budgetCount: 0, budgetTotal: 0, budgetSpent: 500 }), null);
  assert.equal(budgetPercent({ budgetCount: 2, budgetTotal: 1000, budgetSpent: 250 }), 25);
  assert.equal(budgetPercent({ budgetCount: 1, budgetTotal: 1000, budgetSpent: 1200 }), 120);
});

test('midday on a quiet day suggests a meal, a workout and a timer', () => {
  assert.deepEqual(nextActions(quiet, options), ['logMeal', 'workout', 'startTimer']);
});

test('suggestions disappear once done', () => {
  const done: TodayInput = { ...quiet, food: { meals: 2 }, fitness: { minutesWeek: 200, workoutsToday: 1 }, time: { minutesToday: 30 } };
  assert.deepEqual(nextActions(done, options), []);
});

test('a running timer is not suggested again', () => {
  assert.ok(!nextActions(quiet, { ...options, timerRunning: true }).includes('startTimer'));
});

test('spending is suggested only in the evening', () => {
  assert.ok(!nextActions(quiet, { ...options, hour: 12 }).includes('logSpending'));
  assert.ok(nextActions({ ...quiet, food: { meals: 3 }, fitness: { minutesWeek: 999, workoutsToday: 1 }, time: { minutesToday: 60 } }, { ...options, hour: 19 }).includes('logSpending'));
});

test('nothing is suggested in the middle of the night', () => {
  assert.deepEqual(nextActions(quiet, { ...options, hour: 3 }), []);
});

test('only the allowed suggestions are made, and the limit of three applies after filtering', () => {
  assert.deepEqual(nextActions(quiet, { ...options, allowed: ['workout'] }), ['workout']);
  assert.deepEqual(nextActions(quiet, { ...options, allowed: ['startTimer', 'workout'] }), ['workout', 'startTimer']);
  assert.deepEqual(nextActions(quiet, { ...options, allowed: [] }), []);
  const evening = { ...options, hour: 19 };
  assert.deepEqual(nextActions(quiet, { ...evening, allowed: ['logSpending'] }), ['logSpending']);
  assert.deepEqual(nextActions(quiet, evening), ['logMeal', 'workout', 'startTimer']);
});

test('splitMinutes', () => {
  assert.deepEqual(splitMinutes(80), { hours: 1, minutes: 20 });
  assert.deepEqual(splitMinutes(-3), { hours: 0, minutes: 0 });
});
