import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickRoutine, previewOf, routinePartAt } from '../src/components/home/widgets/skincare-logic.ts';

test('routinePartAt shows the morning routine from 04:00 until noon and the evening routine otherwise', () => {
  assert.equal(routinePartAt(4), 'morning');
  assert.equal(routinePartAt(8), 'morning');
  assert.equal(routinePartAt(11), 'morning');
  assert.equal(routinePartAt(12), 'evening');
  assert.equal(routinePartAt(21), 'evening');
  assert.equal(routinePartAt(23), 'evening');
  assert.equal(routinePartAt(0), 'evening');
  assert.equal(routinePartAt(3), 'evening');
});

test('routinePartAt reads an hour that is not a number as evening', () => {
  assert.equal(routinePartAt(Number.NaN), 'evening');
});

test('pickRoutine takes the routine for this time of day when it has steps', () => {
  assert.deepEqual(pickRoutine(['m1', 'm2'], ['e1'], 'morning'), { part: 'morning', steps: ['m1', 'm2'], other: false });
  assert.deepEqual(pickRoutine(['m1', 'm2'], ['e1'], 'evening'), { part: 'evening', steps: ['e1'], other: false });
});

test('pickRoutine falls back to the other routine when the preferred one is empty', () => {
  assert.deepEqual(pickRoutine(['m1'], [], 'evening'), { part: 'morning', steps: ['m1'], other: true });
  assert.deepEqual(pickRoutine([], ['e1'], 'morning'), { part: 'evening', steps: ['e1'], other: true });
});

test('pickRoutine returns nothing when neither routine has steps, and hands back a copy', () => {
  assert.equal(pickRoutine([], [], 'morning'), null);
  const morning = ['m1'];
  const pick = pickRoutine(morning, [], 'morning');
  assert.ok(pick);
  pick.steps.push('extra');
  assert.deepEqual(morning, ['m1']);
});

test('previewOf shows the first steps and counts the rest', () => {
  assert.deepEqual(previewOf([1, 2, 3, 4, 5], 3), { shown: [1, 2, 3], more: 2 });
  assert.deepEqual(previewOf([1, 2, 3, 4, 5, 6, 7], 3), { shown: [1, 2, 3], more: 4 });
});

test('previewOf shows a list that is only one over the limit whole', () => {
  assert.deepEqual(previewOf([1, 2, 3, 4], 3), { shown: [1, 2, 3, 4], more: 0 });
  assert.deepEqual(previewOf([1, 2, 3], 3), { shown: [1, 2, 3], more: 0 });
  assert.deepEqual(previewOf([], 3), { shown: [], more: 0 });
});

test('previewOf copes with a bad limit', () => {
  assert.deepEqual(previewOf([1, 2, 3], Number.NaN), { shown: [1], more: 2 });
  assert.deepEqual(previewOf([1, 2, 3], 0), { shown: [1], more: 2 });
});
