import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  capCount,
  classifyError,
  clampIndex,
  clampPercent,
  contrastRatio,
  hashString,
  initialsOf,
  luminance,
  normalizeHex,
  pickSnap,
  progressLevel,
  readableOn,
  resolveSnapHeights,
  snapOffsets,
  snapToPixels,
  withAlpha,
} from '../src/components/ui/logic.ts';

test('capCount caps at max with a plus and is safe for odd numbers', () => {
  assert.equal(capCount(0), '0');
  assert.equal(capCount(99), '99');
  assert.equal(capCount(100), '99+');
  assert.equal(capCount(12, 9), '9+');
  assert.equal(capCount(7.9), '7');
  assert.equal(capCount(-3), '0');
  assert.equal(capCount(Number.NaN), '0');
});

test('initialsOf uses first and last word, upper-cased', () => {
  assert.equal(initialsOf('arun kumar'), 'AK');
  assert.equal(initialsOf('  Ada   Lovelace Byron '), 'AB');
  assert.equal(initialsOf('Madonna'), 'M');
  assert.equal(initialsOf(''), '');
  assert.equal(initialsOf(undefined), '');
  assert.equal(initialsOf(null), '');
});

test('hashString is stable and non-negative', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.ok(hashString('some long name here') >= 0);
  assert.notEqual(hashString('a'), hashString('b'));
});

test('withAlpha only touches 6 digit hex colours', () => {
  assert.equal(withAlpha('#ff0000', 0.5), '#ff000080');
  assert.equal(withAlpha('#ff0000', 2), '#ff0000ff');
  assert.equal(withAlpha('#ff0000', -1), '#ff000000');
  assert.equal(withAlpha('rgba(1,2,3,1)', 0.5), 'rgba(1,2,3,1)');
  assert.equal(withAlpha('#f00', 0.5), '#f00');
});

test('luminance and contrast follow WCAG', () => {
  assert.equal(luminance('#000000'), 0);
  assert.ok(Math.abs((luminance('#ffffff') ?? 0) - 1) < 1e-9);
  assert.equal(luminance('red'), null);
  assert.equal(normalizeHex('#ABC'), '#aabbcc');
  assert.ok(Math.abs((contrastRatio('#000', '#fff') ?? 0) - 21) < 1e-6);
  assert.equal(contrastRatio('#000', 'blue'), null);
});

test('readableOn picks the higher contrast foreground', () => {
  assert.equal(readableOn('#ffffff', '#ffffff', '#000000'), '#000000');
  assert.equal(readableOn('#101010', '#ffffff', '#000000'), '#ffffff');
  assert.equal(readableOn('transparent', '#ffffff', '#000000'), '#ffffff');
  assert.equal(readableOn('#fff', '#ffffff', '#000000'), '#000000');
});

test('snap points resolve to sorted, unique, clamped heights', () => {
  assert.equal(snapToPixels('50%', 800), 400);
  assert.equal(snapToPixels(300, 800), 300);
  assert.equal(snapToPixels('abc%' as '1%', 800), 0);
  assert.deepEqual(resolveSnapHeights(['90%', '40%', 320, '40%'], 800, 700), [320, 700]);
  assert.deepEqual(resolveSnapHeights(['40%', '90%'], 800, 700), [320, 700]);
  assert.deepEqual(resolveSnapHeights([-10], 800, 700), [0]);
});

test('snap offsets run top-most first and indexes clamp', () => {
  assert.deepEqual(snapOffsets([320, 700], 700), [0, 380]);
  assert.equal(clampIndex(5, 2), 1);
  assert.equal(clampIndex(-1, 2), 0);
  assert.equal(clampIndex(3, 0), 0);
});

test('pickSnap lands on the nearest snap or dismisses', () => {
  const offsets = [0, 380];
  const hidden = 700;
  assert.equal(pickSnap(20, offsets, hidden, true), 0);
  assert.equal(pickSnap(350, offsets, hidden, true), 1);
  assert.equal(pickSnap(690, offsets, hidden, true), -1);
  // not dismissible: the same flick settles on the lowest snap instead
  assert.equal(pickSnap(690, offsets, hidden, false), 1);
});

test('classifyError maps status, abort and network messages', () => {
  assert.equal(classifyError({ status: 0 }), 'network');
  assert.equal(classifyError({ status: 0, timeout: true }), 'timeout');
  assert.equal(classifyError({ status: 401 }), 'sessionExpired');
  assert.equal(classifyError({ status: 404 }), 'notFound');
  assert.equal(classifyError({ status: 408 }), 'timeout');
  assert.equal(classifyError({ status: 504 }), 'timeout');
  assert.equal(classifyError({ status: 500 }), 'generic');
  assert.equal(classifyError({ name: 'AbortError' }), 'timeout');
  assert.equal(classifyError({ name: 'TypeError', message: 'Network request failed' }), 'network');
  assert.equal(classifyError({ name: 'Error', message: 'boom' }), 'generic');
  assert.equal(classifyError({}), 'generic');
});

test('progress levels and clamping', () => {
  assert.equal(progressLevel(50, true), 'normal');
  assert.equal(progressLevel(80, true), 'near');
  assert.equal(progressLevel(100, true), 'over');
  assert.equal(progressLevel(150, false), 'normal');
  assert.equal(clampPercent(150), 100);
  assert.equal(clampPercent(-5), 0);
  assert.equal(clampPercent(Number.NaN), 0);
});
