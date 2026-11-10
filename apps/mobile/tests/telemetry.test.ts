import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTelemetry, type TelemetryAdapter } from '../src/lib/telemetry/core.ts';

function memoryConsent(initial: boolean | null) {
  let value = initial;
  return { get: async () => value, set: async (v: boolean) => void (value = v), read: () => value };
}

function recorder() {
  const calls: string[] = [];
  const adapter: TelemetryAdapter = {
    name: 'test',
    track: (e, p) => void calls.push(`track:${e}:${JSON.stringify(p ?? null)}`),
    screen: (n) => void calls.push(`screen:${n}`),
    captureException: (e) => void calls.push(`error:${(e as Error).message}`),
  };
  return { calls, adapter };
}

test('nothing is sent until the user opts in', async () => {
  const t = createTelemetry(memoryConsent(null));
  const { calls, adapter } = recorder();
  t.addAdapter(adapter);
  await t.ready();
  t.track('note_created');
  t.screen('/notes');
  t.captureException(new Error('boom'));
  assert.deepEqual(calls, []);
});

test('after opting in, events, screens and exceptions reach every adapter', async () => {
  const consent = memoryConsent(null);
  const t = createTelemetry(consent);
  const { calls, adapter } = recorder();
  t.addAdapter(adapter);
  await t.ready();
  await t.setEnabled(true);
  t.track('transaction_created', { type: 'expense' });
  t.screen('/finance');
  t.captureException(new Error('boom'));
  assert.deepEqual(calls, ['track:transaction_created:{"type":"expense"}', 'screen:/finance', 'error:boom']);
  assert.equal(consent.read(), true);
});

test('stored consent is honoured on the next launch', async () => {
  const t = createTelemetry(memoryConsent(true));
  await t.ready();
  assert.equal(t.isEnabled(), true);
});

test('a throwing adapter never breaks the app or other adapters', async () => {
  const t = createTelemetry(memoryConsent(true));
  const { calls, adapter } = recorder();
  t.addAdapter({
    name: 'bad',
    track() {
      throw new Error('sdk crashed');
    },
  });
  t.addAdapter(adapter);
  await t.ready();
  t.track('note_deleted');
  assert.deepEqual(calls, ['track:note_deleted:null']);
});
