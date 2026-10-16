import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EMPTY_TOAST_QUEUE, MIN_ACTION_DURATION, dismissToastIn, enqueueToast, normalizeToast } from '../src/lib/notify.ts';

const undo = { label: 'Undo', onPress() {} };

test('identical plain toasts merge and restart the timer instead of stacking', () => {
  let q = enqueueToast(EMPTY_TOAST_QUEUE, normalizeToast({ message: 'Saved' }));
  q = enqueueToast(q, normalizeToast({ message: 'Saved' }));
  assert.equal(q.queue.length, 0);
  assert.equal(q.current?.nonce, 1);
});

test('toasts with onClose are never merged, so every Undo window gets its own callback', () => {
  const closed: string[] = [];
  const make = (id: string) => normalizeToast({ id, message: 'Note deleted', action: undo, onClose: () => closed.push(id) });
  let q = enqueueToast(EMPTY_TOAST_QUEUE, make('a'));
  q = enqueueToast(q, make('b'));
  q = enqueueToast(q, make('c'));
  assert.equal(q.current?.id, 'a');
  assert.deepEqual(
    q.queue.map((t) => t.id),
    ['b', 'c'],
  );
});

test('dismissing promotes the next toast; dismissing a queued id removes only that one', () => {
  let q = enqueueToast(EMPTY_TOAST_QUEUE, normalizeToast({ id: 'a', message: 'One' }));
  q = enqueueToast(q, normalizeToast({ id: 'b', message: 'Two' }));
  q = enqueueToast(q, normalizeToast({ id: 'c', message: 'Three' }));
  q = dismissToastIn(q, 'b');
  assert.deepEqual(
    q.queue.map((t) => t.id),
    ['c'],
  );
  q = dismissToastIn(q);
  assert.equal(q.current?.id, 'c');
});

test('more severe toasts jump ahead of less severe queued ones', () => {
  let q = enqueueToast(EMPTY_TOAST_QUEUE, normalizeToast({ id: 'a', message: 'Info', severity: 'info' }));
  q = enqueueToast(q, normalizeToast({ id: 'b', message: 'Info 2', severity: 'info' }));
  q = enqueueToast(q, normalizeToast({ id: 'c', message: 'Failed', severity: 'error' }));
  assert.equal(q.queue[0].id, 'c');
});

test('a toast with an action stays long enough to be tapped', () => {
  const t = normalizeToast({ message: 'Deleted', severity: 'info', duration: 1000, action: undo });
  assert.ok(t.duration >= MIN_ACTION_DURATION);
});
