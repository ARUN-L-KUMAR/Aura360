import assert from 'node:assert/strict';
import { test } from 'node:test';

import { noRejections } from '../src/features/share-import/accept.ts';
import {
  currentItem,
  emptyInbox,
  hasArrivals,
  inboxReducer,
  positionOf,
  savedItems,
  unfinishedCount,
  type InboxAction,
  type InboxState,
} from '../src/features/share-import/queue.ts';
import { HANDLED_MAX, HANDLED_TTL_MS, findHandled, parseHandled, pruneHandled, recordHandled } from '../src/features/share-import/handled-logic.ts';

const run = (actions: InboxAction[], from: InboxState = emptyInbox) => actions.reduce(inboxReducer, from);
const received = (ids: string[], shareId = 1): InboxAction => ({
  type: 'received',
  shareId,
  items: ids.map((id) => ({ id, sourceUri: `content://app/${id}`, mimeType: 'image/png' })),
  rejected: noRejections(),
});
const staged = (id: string, over: Partial<Extract<InboxAction, { type: 'staged' }>> = {}): InboxAction => ({
  type: 'staged',
  id,
  fileUri: `file:///cache/${id}.img`,
  mimeType: 'image/png',
  fingerprint: `fp-${id}`,
  seenBefore: null,
  ...over,
});
const draft = { type: 'expense' as const, amount: 10, category: 'Food', description: '', date: null, paymentMethod: 'upi' as const, notes: null };

test('a share enters the queue once, waiting to be copied', () => {
  const state = run([received(['a'])]);
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].status, 'staging');
  assert.equal(state.items[0].shareId, 1);
  assert.equal(currentItem(state)?.id, 'a');
});

test('receiving the same item again does not queue it twice', () => {
  const state = run([received(['a', 'b']), received(['a', 'b'])]);
  assert.deepEqual(state.items.map((i) => i.id), ['a', 'b']);
});

test('items keep arrival order and a later share is appended', () => {
  const state = run([received(['a']), received(['b', 'c'], 2)]);
  assert.deepEqual(state.items.map((i) => [i.id, i.shareId]), [['a', 1], ['b', 2], ['c', 2]]);
});

test('a copied item becomes ready with what the file really is, and may be marked as seen before', () => {
  const state = run([received(['a']), staged('a', { mimeType: 'image/webp', seenBefore: 'saved' })]);
  assert.equal(state.items[0].status, 'ready');
  assert.equal(state.items[0].mimeType, 'image/webp');
  assert.equal(state.items[0].seenBefore, 'saved');
  assert.equal(state.items[0].fileUri, 'file:///cache/a.img');
});

test('staging cannot revive an item that already moved on', () => {
  const state = run([received(['a']), { type: 'skipped', id: 'a' }, staged('a')]);
  assert.equal(state.items[0].status, 'skipped');
  assert.equal(state.items[0].fileUri, null);
});

test('reading starts only from ready, and only once', () => {
  const afterRead = run([received(['a']), { type: 'reading', id: 'a' }]);
  assert.equal(afterRead.items[0].status, 'staging'); // not copied yet: nothing to read
  const ready = run([received(['a']), staged('a'), { type: 'reading', id: 'a' }]);
  assert.equal(ready.items[0].status, 'reading');
  assert.equal(run([{ type: 'reading', id: 'a' }], ready), ready); // a second start changes nothing
});

test('a successful read goes to review and keeps the draft so the form can be reopened', () => {
  const state = run([received(['a']), staged('a'), { type: 'reading', id: 'a' }, { type: 'review', id: 'a', draft }]);
  assert.equal(state.items[0].status, 'review');
  assert.deepEqual(state.items[0].draft, draft);
});

test('review is not reachable from an item that was never read', () => {
  const state = run([received(['a']), staged('a'), { type: 'review', id: 'a', draft }]);
  assert.equal(state.items[0].status, 'ready');
});

test('a failure records why, and "try again" returns to ready when the copy exists', () => {
  const failed = run([received(['a']), staged('a'), { type: 'reading', id: 'a' }, { type: 'failed', id: 'a', error: 'network' }]);
  assert.equal(failed.items[0].status, 'failed');
  assert.equal(failed.items[0].error, 'network');
  const again = run([{ type: 'retry', id: 'a' }], failed);
  assert.equal(again.items[0].status, 'ready');
  assert.equal(again.items[0].error, null);
});

test('"try again" after a copy failed copies again first', () => {
  const state = run([received(['a']), { type: 'failed', id: 'a', error: 'unreadable' }, { type: 'retry', id: 'a' }]);
  assert.equal(state.items[0].status, 'staging');
});

test('retry only applies to a failed item', () => {
  const ready = run([received(['a']), staged('a')]);
  assert.equal(run([{ type: 'retry', id: 'a' }], ready), ready);
});

test('"add it by hand" can park a failed item in review', () => {
  const state = run([received(['a']), { type: 'failed', id: 'a', error: 'notPayment' }, { type: 'review', id: 'a', draft }]);
  assert.equal(state.items[0].status, 'review');
  assert.equal(state.items[0].error, null);
});

test('saving settles an item for good: it cannot be skipped, failed or saved again afterwards', () => {
  const saved = run([received(['a']), staged('a'), { type: 'saved', id: 'a', summary: { amount: 5, description: 'x' } }]);
  assert.equal(saved.items[0].status, 'saved');
  for (const action of [{ type: 'skipped', id: 'a' }, { type: 'failed', id: 'a', error: 'server' }, { type: 'saved', id: 'a', summary: { amount: 9, description: 'y' } }] as InboxAction[]) {
    assert.equal(run([action], saved), saved);
  }
  assert.deepEqual(saved.items[0].saved, { amount: 5, description: 'x' });
});

test('"import anyway" applies to a ready item only', () => {
  const ready = run([received(['a']), staged('a', { seenBefore: 'skipped' }), { type: 'importAgain', id: 'a' }]);
  assert.equal(ready.items[0].importAgain, true);
  const staging = run([received(['a']), { type: 'importAgain', id: 'a' }]);
  assert.equal(staging.items[0].importAgain, false);
});

test('actions for an unknown id change nothing', () => {
  const state = run([received(['a'])]);
  for (const type of ['staged', 'reading', 'skipped', 'retry', 'importAgain'] as const) {
    const action = type === 'staged' ? staged('zzz') : ({ type, id: 'zzz' } as InboxAction);
    assert.equal(run([action], state), state);
  }
});

test('the current item is the first one not yet saved or skipped, and the rest follow', () => {
  let state = run([received(['a', 'b', 'c']), staged('a'), staged('b'), staged('c')]);
  assert.equal(currentItem(state)?.id, 'a');
  assert.equal(unfinishedCount(state), 3);
  state = run([{ type: 'saved', id: 'a', summary: { amount: 1, description: '' } }], state);
  assert.equal(currentItem(state)?.id, 'b');
  state = run([{ type: 'skipped', id: 'b' }], state);
  assert.equal(currentItem(state)?.id, 'c');
  assert.equal(unfinishedCount(state), 1);
  assert.deepEqual(savedItems(state).map((i) => i.id), ['a']);
  assert.deepEqual(positionOf(state, 'c'), { index: 3, total: 3 });
  state = run([{ type: 'skipped', id: 'c' }], state);
  assert.equal(currentItem(state), null);
});

test('files that were turned away are remembered with the share, and add up across shares', () => {
  const state = run([
    { type: 'received', shareId: 1, items: [], rejected: { unsupported: 2, unsafe: 0, tooMany: 0, empty: 0 } },
    { type: 'received', shareId: 2, items: [], rejected: { unsupported: 1, unsafe: 1, tooMany: 4, empty: 1 } },
  ]);
  assert.deepEqual(state.rejected, { unsupported: 3, unsafe: 1, tooMany: 4, empty: 1 });
  assert.equal(hasArrivals(state), true); // the screen has something to say even with nothing to import
});

test('a share that arrived with nothing readable in it is still something to show, not silence', () => {
  const state = run([{ type: 'received', shareId: 1, items: [], rejected: { ...noRejections(), empty: 1 } }]);
  assert.equal(hasArrivals(state), true);
  assert.equal(state.items.length, 0);
  assert.equal(state.rejected.empty, 1);
});

test('nothing has arrived until something is received, and clear forgets everything', () => {
  assert.equal(hasArrivals(emptyInbox), false);
  const state = run([received(['a'])]);
  assert.equal(hasArrivals(state), true);
  assert.equal(run([{ type: 'clear' }], state), emptyInbox);
});

// ── handled screenshots ─────────────────────────────────────────────────────────────────────────────────────────

const NOW = 1_800_000_000_000;

test('a screenshot handled earlier is found by its hash, and only within the time limit', () => {
  const list = recordHandled([], { fp: 'abc', at: NOW, outcome: 'saved' }, NOW);
  assert.equal(findHandled(list, 'abc', NOW + 1000)?.outcome, 'saved');
  assert.equal(findHandled(list, 'other', NOW), null);
  assert.equal(findHandled(list, null, NOW), null);
  assert.equal(findHandled(list, 'abc', NOW + HANDLED_TTL_MS + 1), null);
});

test('handling the same screenshot again replaces its entry and keeps the newest first', () => {
  let list = recordHandled([], { fp: 'a', at: NOW, outcome: 'skipped' }, NOW);
  list = recordHandled(list, { fp: 'b', at: NOW + 1, outcome: 'saved' }, NOW + 1);
  list = recordHandled(list, { fp: 'a', at: NOW + 2, outcome: 'saved' }, NOW + 2);
  assert.deepEqual(list.map((e) => [e.fp, e.outcome]), [['a', 'saved'], ['b', 'saved']]);
});

test('old entries are dropped and the list never grows past its limit', () => {
  const old = { fp: 'old', at: NOW - HANDLED_TTL_MS - 1, outcome: 'saved' as const };
  assert.deepEqual(pruneHandled([old], NOW), []);
  let list: ReturnType<typeof recordHandled> = [];
  for (let i = 0; i < HANDLED_MAX + 10; i++) list = recordHandled(list, { fp: `fp${i}`, at: NOW + i, outcome: 'saved' }, NOW + i);
  assert.equal(list.length, HANDLED_MAX);
  assert.equal(list[0].fp, `fp${HANDLED_MAX + 9}`);
});

test('a damaged stored value reads as empty rather than throwing', () => {
  for (const raw of [null, undefined, '', 'not json', '{}', '"x"', '[1,2]', '[{"fp":1}]']) assert.deepEqual(parseHandled(raw), []);
  assert.deepEqual(parseHandled('[{"fp":"a","at":5,"outcome":"saved"},{"fp":"b","at":"x","outcome":"saved"},{"fp":"c","at":6,"outcome":"weird"}]'), [{ fp: 'a', at: 5, outcome: 'saved' }]);
});
