import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isExpectedFailure } from '../src/lib/telemetry/expected.ts';

const apiError = (status: number, message = 'x') => Object.assign(new Error(message), { name: 'ApiError', status });

test('being offline or timing out is expected, not a crash', () => {
  assert.equal(isExpectedFailure(apiError(0, "Can't reach the server. Check your connection.")), true);
  assert.equal(isExpectedFailure(new TypeError('Network request failed')), true);
  assert.equal(isExpectedFailure(Object.assign(new Error('aborted'), { name: 'AbortError' })), true);
});

test('4xx responses (bad input, signed out) are expected', () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429]) assert.equal(isExpectedFailure(apiError(status)), true, String(status));
});

test('server errors and unknown exceptions are still reported', () => {
  assert.equal(isExpectedFailure(apiError(500)), false);
  assert.equal(isExpectedFailure(apiError(503)), false);
  assert.equal(isExpectedFailure(new Error('Cannot read properties of undefined')), false);
  assert.equal(isExpectedFailure('boom'), false);
  assert.equal(isExpectedFailure(null), false);
});
