import assert from 'node:assert/strict';
import { test } from 'node:test';

import { directionOf, percentChange, shiftIsoDay, weekStats } from '../src/components/food/week-stats.ts';
import type { Meal } from '../src/features/food/types.ts';

const meal = (date: string, calories: number, protein: number): Meal => ({
  id: `${date}-${calories}`,
  date,
  mealType: 'lunch',
  foodName: 'Food',
  quantity: null,
  unit: null,
  calories,
  protein: String(protein),
  carbs: null,
  fats: null,
  fiber: null,
  sugar: null,
  notes: null,
  createdAt: `${date}T12:00:00.000Z`,
});

test('shiftIsoDay crosses month and year ends', () => {
  assert.equal(shiftIsoDay('2026-10-31', 1), '2026-11-01');
  assert.equal(shiftIsoDay('2026-01-01', -1), '2025-12-31');
});

test('weekStats averages per logged day and keeps the two windows apart', () => {
  const meals = [
    meal('2026-10-09', 500, 30),
    meal('2026-10-09', 700, 20),
    meal('2026-10-07', 800, 40),
    meal('2026-10-03', 600, 10), // first day of the latest window
    meal('2026-10-02', 1000, 50), // last day of the window before
    meal('2026-09-26', 400, 20), // first day of the window before
    meal('2026-09-25', 9999, 99), // too old
  ];
  const { latest, before } = weekStats(meals, '2026-10-09');
  assert.deepEqual(latest, { days: 3, meals: 4, calories: 2600, protein: 100, averageCalories: 867, averageProtein: 33 });
  assert.deepEqual(before, { days: 2, meals: 2, calories: 1400, protein: 70, averageCalories: 700, averageProtein: 35 });
});

test('an empty window averages to zero instead of dividing by zero', () => {
  const { latest } = weekStats([], '2026-10-09');
  assert.equal(latest.averageCalories, 0);
  assert.equal(latest.days, 0);
});

test('percentChange is null without an earlier value, directionOf follows the sign', () => {
  assert.equal(percentChange(120, 100), 20);
  assert.equal(percentChange(80, 100), -20);
  assert.equal(percentChange(50, 0), null);
  assert.equal(directionOf(3), 'up');
  assert.equal(directionOf(-1), 'down');
  assert.equal(directionOf(0), 'flat');
});
