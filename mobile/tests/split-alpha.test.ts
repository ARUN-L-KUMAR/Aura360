import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitAlpha, withAlpha } from '../src/components/ui/logic.ts';

test('splitAlpha separates the alpha of an 8-digit hex colour', () => {
  assert.deepEqual(splitAlpha('#6366f1ff'), { color: '#6366f1', opacity: 1 });
  assert.deepEqual(splitAlpha('#38bdf800'), { color: '#38bdf8', opacity: 0 });
  const half = splitAlpha('#6366f180');
  assert.equal(half.color, '#6366f1');
  assert.ok(Math.abs(half.opacity - 0.502) < 0.001);
});

test('splitAlpha reads what withAlpha writes', () => {
  const out = splitAlpha(withAlpha('#0ea5e9', 0.34));
  assert.equal(out.color, '#0ea5e9');
  assert.ok(Math.abs(out.opacity - 0.34) < 0.01);
});

test('splitAlpha handles rgba() strings', () => {
  assert.deepEqual(splitAlpha('rgba(255, 255, 255, 0.1)'), { color: '#ffffff', opacity: 0.1 });
  assert.deepEqual(splitAlpha('rgba(0,0,0,2)'), { color: '#000000', opacity: 1 });
});

test('splitAlpha leaves solid colours opaque', () => {
  assert.deepEqual(splitAlpha('#6366f1'), { color: '#6366f1', opacity: 1 });
  assert.deepEqual(splitAlpha('red'), { color: 'red', opacity: 1 });
});
