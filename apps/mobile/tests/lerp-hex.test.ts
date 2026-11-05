import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lerpHex } from '../src/components/ui/logic.ts';

test('endpoints return the two colours and the midpoint blends them', () => {
  assert.equal(lerpHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(lerpHex('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(lerpHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(lerpHex('#ff0000', '#0000ff', 0.5), '#800080');
});

test('t is clamped and NaN counts as the start colour', () => {
  assert.equal(lerpHex('#102030', '#405060', -3), '#102030');
  assert.equal(lerpHex('#102030', '#405060', 9), '#405060');
  assert.equal(lerpHex('#102030', '#405060', Number.NaN), '#102030');
});

test('colours that are not 6-digit hex fall back to the first colour', () => {
  assert.equal(lerpHex('rgba(0,0,0,0.5)', '#ffffff', 0.5), 'rgba(0,0,0,0.5)');
  assert.equal(lerpHex('#fff', '#000', 0.5), '#fff');
});
