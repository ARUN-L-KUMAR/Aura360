import assert from 'node:assert/strict';
import { test } from 'node:test';

import { WEEK_MS, latestSaved, savedSummary } from '../src/components/home/widgets/saved-logic.ts';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

const item = (id: string, createdAt: string, isFavorite: boolean | null = false) => ({ id, createdAt, isFavorite });

test('savedSummary counts everything, the favourites and what was added in the last 7 days', () => {
  const items = [item('a', ago(DAY), true), item('b', ago(3 * DAY)), item('c', ago(10 * DAY), true), item('d', ago(30 * DAY), null)];
  assert.deepEqual(savedSummary(items, NOW), { total: 4, favourites: 2, thisWeek: 2 });
});

test('savedSummary includes the item added exactly 7 days ago and leaves out the one just before', () => {
  assert.equal(savedSummary([item('edge', ago(WEEK_MS))], NOW).thisWeek, 1);
  assert.equal(savedSummary([item('old', ago(WEEK_MS + 1))], NOW).thisWeek, 0);
});

test('savedSummary does not count an unreadable date as new, and handles an empty list', () => {
  assert.equal(savedSummary([item('x', 'not a date')], NOW).thisWeek, 0);
  assert.deepEqual(savedSummary([], NOW), { total: 0, favourites: 0, thisWeek: 0 });
});

test('latestSaved puts the newest first even though the server lists favourites first', () => {
  const fromServer = [item('fav-old', ago(20 * DAY), true), item('new', ago(DAY)), item('mid', ago(5 * DAY)), item('fav-mid', ago(9 * DAY), true)];
  assert.deepEqual(latestSaved(fromServer, 3).map((i) => i.id), ['new', 'mid', 'fav-mid']);
});

test('latestSaved keeps the incoming order for equal times and puts unreadable dates last', () => {
  const same = ago(DAY);
  const list = [item('bad', 'nope'), item('first', same), item('second', same), item('older', ago(2 * DAY))];
  assert.deepEqual(latestSaved(list, 4).map((i) => i.id), ['first', 'second', 'older', 'bad']);
});

test('latestSaved does not change its input and copes with a short list or a bad limit', () => {
  const list = [item('a', ago(2 * DAY)), item('b', ago(DAY))];
  const copy = [...list];
  assert.deepEqual(latestSaved(list, 5).map((i) => i.id), ['b', 'a']);
  assert.deepEqual(list, copy);
  assert.deepEqual(latestSaved(list, 0), []);
  assert.deepEqual(latestSaved(list, -3), []);
  assert.deepEqual(latestSaved([], 3), []);
});
