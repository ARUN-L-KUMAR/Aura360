import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitLayoutStyle } from '../src/components/ui/logic.ts';

test('sizing and placement go to the outer touchable, appearance stays inner', () => {
  const { outer, inner } = splitLayoutStyle({ flexGrow: 1, flexBasis: '45%', gap: 8, borderRadius: 16, padding: 12, marginTop: 4 });
  assert.deepEqual(outer, { flexGrow: 1, flexBasis: '45%', marginTop: 4 });
  assert.deepEqual(inner, { gap: 8, borderRadius: 16, padding: 12 });
});

test('arrays, nulls and false are flattened, later values win', () => {
  const { outer, inner } = splitLayoutStyle([{ width: 100, padding: 4 }, null, false, [{ width: 120 }, { padding: 8 }]]);
  assert.deepEqual(outer, { width: 120 });
  assert.deepEqual(inner, { padding: 8 });
});

test('absolute positioning moves to the outer touchable too', () => {
  const { outer } = splitLayoutStyle({ position: 'absolute', end: 16, bottom: 16 });
  assert.deepEqual(outer, { position: 'absolute', end: 16, bottom: 16 });
});

test('empty and undefined styles are safe', () => {
  assert.deepEqual(splitLayoutStyle(undefined), { outer: {}, inner: {} });
  assert.deepEqual(splitLayoutStyle([]), { outer: {}, inner: {} });
});
