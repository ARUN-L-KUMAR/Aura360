import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  __resetForTests,
  configureQueue,
  discard,
  enqueue,
  getSnapshot,
  isQueueable,
  replay,
  setCurrentUser,
  setOnline,
} from '../src/lib/offline/queue.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: async (k: string) => data.get(k) ?? null, setItem: async (k: string, v: string) => void data.set(k, v) };
}

let nextId = 0;
beforeEach(() => {
  __resetForTests();
  nextId = 0;
  configureQueue({ storage: memoryStorage(), randomId: () => `id-${++nextId}` });
  void setCurrentUser('user-1');
  void setOnline(false);
});

test('only creates on the known endpoints are queueable', () => {
  assert.equal(isQueueable('POST', '/api/notes'), true);
  assert.equal(isQueueable('POST', '/api/notes?x=1'), true);
  assert.equal(isQueueable('PATCH', '/api/notes'), false);
  assert.equal(isQueueable('POST', '/api/something-else'), false);
  assert.equal(isQueueable(undefined, '/api/notes'), false);
});

test('an entry queued offline is replayed once, in order, and then cleared', async () => {
  await enqueue('/api/notes', { title: 'first' });
  await enqueue('/api/notes', { title: 'second' });
  assert.equal(getSnapshot().pending, 2);

  const sent: unknown[] = [];
  const result = await replay(async (_path, body) => void sent.push(body));
  assert.deepEqual(sent, [{ title: 'first' }, { title: 'second' }]);
  assert.equal(result.sent, 2);
  assert.equal(getSnapshot().pending, 0);
});

test('a server rejection moves the entry to failed instead of retrying forever', async () => {
  await enqueue('/api/notes', { title: 'bad' });
  const result = await replay(async () => {
    throw Object.assign(new Error('Invalid'), { status: 422 });
  });
  assert.equal(result.failed, 1);
  assert.equal(getSnapshot().failed, 1);
  assert.equal(getSnapshot().pending, 0);
});

test('discarding removes an entry without sending it', async () => {
  await enqueue('/api/notes', { title: 'oops' });
  const [item] = getSnapshot().items;
  await discard(item.id);
  assert.equal(getSnapshot().pending, 0);
});

test("one account's queued entries are never visible to another", async () => {
  await enqueue('/api/notes', { title: 'mine' });
  await setCurrentUser('user-2');
  assert.equal(getSnapshot().pending, 0);
  await setCurrentUser('user-1');
  assert.equal(getSnapshot().pending, 1);
});

test('queueing an entry flashes a structured notice, not English text', async () => {
  await enqueue('/api/notes', { title: 'hello' });
  const notice = getSnapshot().notice;
  assert.equal(notice?.kind, 'saved');
  assert.ok(notice?.label);
});
