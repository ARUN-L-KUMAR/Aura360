import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assignSlot, DEFAULT_SLOTS, normalizeSlots, slotOf } from '../src/features/nav/slots.ts';

test('defaults to finance and fashion', () => {
  assert.deepEqual(DEFAULT_SLOTS, ['finance', 'fashion']);
});

test('normalizeSlots accepts two different known modules', () => {
  assert.deepEqual(normalizeSlots(['notes', 'time']), ['notes', 'time']);
});

test('normalizeSlots falls back on anything else', () => {
  for (const bad of [null, undefined, 'finance', [], ['finance'], ['finance', 'finance'], ['finance', 'nope'], [1, 2], ['a', 'b', 'c']]) {
    assert.deepEqual(normalizeSlots(bad), DEFAULT_SLOTS);
  }
});

test('assignSlot replaces one slot', () => {
  assert.deepEqual(assignSlot(['finance', 'fashion'], 1, 'notes'), ['finance', 'notes']);
  assert.deepEqual(assignSlot(['finance', 'fashion'], 0, 'time'), ['time', 'fashion']);
});

test('assignSlot swaps when the module is in the other slot', () => {
  assert.deepEqual(assignSlot(['finance', 'fashion'], 0, 'fashion'), ['fashion', 'finance']);
  assert.deepEqual(assignSlot(['finance', 'fashion'], 1, 'finance'), ['fashion', 'finance']);
});

test('assignSlot keeps the same array when nothing changes', () => {
  const slots = ['finance', 'fashion'] as const;
  assert.equal(assignSlot(slots, 0, 'finance'), slots);
});

test('slotOf finds a pinned module or -1', () => {
  assert.equal(slotOf(['finance', 'fashion'], 'fashion'), 1);
  assert.equal(slotOf(['finance', 'fashion'], 'notes'), -1);
});
