import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDraft,
  buildNotes,
  confirmReasons,
  hasAnyDetail,
  manualDraft,
  normalizeScan,
  validDay,
} from '../src/features/share-import/draft.ts';
import { canRetry, codeForApiFailure } from '../src/features/share-import/error-code.ts';
import type { DuplicateMatch, PaymentRead } from '../src/features/share-import/types.ts';

const categories = {
  expense: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Rent', 'Groceries', 'Other'],
  income: ['Salary', 'Freelance', 'Business', 'Scholarship', 'Gift', 'Interest', 'Refund', 'Other Income'],
};

const full: PaymentRead = {
  isPayment: true,
  app: 'gpay',
  status: 'success',
  direction: 'paid',
  amount: 250,
  currency: 'INR',
  counterparty: 'Raju Tea Stall',
  date: '2026-10-12',
  referenceId: '123456789012',
  note: 'chai',
  category: 'Food',
  paymentMethod: 'upi',
  confidence: 0.92,
};

const draftOf = (read: PaymentRead, duplicates: DuplicateMatch[] | null = []) => buildDraft(read, { itemId: 'item-1', categories, duplicates });

// ── reading the server's answer ────────────────────────────────────────────────────────────────────────────────

test('a payment answer is checked field by field', () => {
  const read = normalizeScan({ ...full, amount: '250.456', date: '2026-10-12', currency: 'inr', confidence: 0.5, extra: 'ignored' });
  assert.ok(read);
  assert.equal(read.amount, 250.46);
  assert.equal(read.currency, 'INR');
  assert.equal(read.confidence, 0.5);
  assert.equal('extra' in read, false);
});

test('invalid values become unknown instead of being repaired or invented', () => {
  const read = normalizeScan({
    isPayment: true,
    app: 'venmo',
    status: 'done',
    direction: 'sideways',
    amount: -5,
    currency: 'rupees',
    counterparty: '   ',
    date: '2026-02-30', // not a real day
    referenceId: '',
    note: 7,
    category: 42,
    paymentMethod: 'cheque',
    confidence: 'high',
  });
  assert.ok(read);
  assert.deepEqual(
    { ...read },
    {
      isPayment: true,
      app: null,
      status: null,
      direction: null,
      amount: null,
      currency: null,
      counterparty: null,
      date: null,
      referenceId: null,
      note: null,
      category: null,
      paymentMethod: null,
      confidence: 0,
    },
  );
});

test('garbage answers are rejected, not guessed at', () => {
  for (const bad of [null, undefined, 'text', 42, [], {}, { success: true }, { amount: 5 }]) {
    assert.equal(normalizeScan(bad), null);
  }
});

test('an older server answers with the receipt shape; it is accepted but cannot claim direction, status or app', () => {
  const read = normalizeScan({ merchant: 'Starbucks', amount: 412.5, date: '2026-10-12', category: 'Food & Dining', paymentMethod: 'card', receiptNumber: 'INV-0042', notes: null, confidence: 90 });
  assert.ok(read);
  assert.equal(read.isPayment, true);
  assert.equal(read.counterparty, 'Starbucks');
  assert.equal(read.category, 'Food');
  assert.equal(read.referenceId, 'INV-0042');
  assert.equal(read.confidence, 0.9);
  assert.equal(read.direction, null);
  assert.equal(read.status, null);
  assert.equal(read.app, null);
});

test('the older reader\'s "Store Receipt" stand-in is not mistaken for a merchant', () => {
  assert.equal(normalizeScan({ merchant: 'Store Receipt', amount: 10, date: '2026-10-12', category: 'Shopping', paymentMethod: 'card', confidence: 90 })?.counterparty, null);
  assert.equal(normalizeScan({ merchant: 'x', amount: 0, date: '2026-10-12', category: 'Other', paymentMethod: 'card', confidence: 90 })?.isPayment, false);
});

test('validDay accepts only real calendar days', () => {
  assert.equal(validDay('2026-10-12'), '2026-10-12');
  assert.equal(validDay('2028-02-29'), '2028-02-29');
  for (const bad of ['2026-02-29', '2026-13-01', '2026-00-10', '12/10/2026', '2026-10-1', '', null, 20261012]) assert.equal(validDay(bad), null);
});

test('hasAnyDetail is false for a "payment" in which nothing was found', () => {
  const nothing: PaymentRead = { ...full, amount: null, counterparty: null, date: null, referenceId: null };
  assert.equal(hasAnyDetail(nothing), false);
  assert.equal(hasAnyDetail({ ...nothing, referenceId: '123456' }), true);
});

// ── the draft ───────────────────────────────────────────────────────────────────────────────────────────────────

test('a clear GPay payment becomes an editable expense with no warnings', () => {
  const draft = draftOf(full);
  assert.deepEqual(
    { ...draft, share: undefined },
    {
      type: 'expense',
      amount: 250,
      category: 'Food',
      description: 'Raju Tea Stall',
      date: '2026-10-12',
      paymentMethod: 'upi',
      notes: 'Google Pay · Ref 123456789012 · chai',
      share: undefined,
    },
  );
  assert.deepEqual(draft.share, { itemId: 'item-1', app: 'gpay', status: 'success', warnings: [], duplicates: [] });
});

test('money received becomes income, and its category must be an income category', () => {
  const income = draftOf({ ...full, direction: 'received', category: 'Salary' });
  assert.equal(income.type, 'income');
  assert.equal(income.category, 'Salary');
  // A food category on money received is dropped, not carried over.
  assert.equal(draftOf({ ...full, direction: 'received', category: 'Food' }).category, '');
});

test('what the screenshot did not show stays unknown, and is flagged', () => {
  const draft = draftOf({ ...full, amount: null, date: null, direction: null, category: null, counterparty: null, referenceId: null, note: null, app: null });
  assert.equal(draft.amount, 0);
  assert.equal(draft.date, null);
  assert.equal(draft.category, '');
  assert.equal(draft.description, '');
  assert.equal(draft.notes, null);
  assert.deepEqual(draft.share?.warnings, ['directionUnknown', 'amountMissing', 'dateMissing']);
});

test('a category the form does not offer is dropped rather than shown as a made-up custom category', () => {
  assert.equal(draftOf({ ...full, category: 'Pet care' }).category, '');
});

test('a failed or pending payment is flagged so the person is not told it went through', () => {
  assert.deepEqual(draftOf({ ...full, status: 'failed' }).share?.warnings, ['statusFailed']);
  assert.deepEqual(draftOf({ ...full, status: 'pending' }).share?.warnings, ['statusPending']);
});

test('another currency and a hard-to-read screenshot are flagged', () => {
  assert.deepEqual(draftOf({ ...full, currency: 'USD' }).share?.warnings, ['currencyOther']);
  assert.deepEqual(draftOf({ ...full, confidence: 0.3 }).share?.warnings, ['lowConfidence']);
  assert.deepEqual(draftOf({ ...full, currency: null }).share?.warnings, []);
});

test('when the ledger could not be checked the draft says so, and shows no duplicates', () => {
  const draft = draftOf(full, null);
  assert.deepEqual(draft.share?.warnings, ['duplicateCheckSkipped']);
  assert.deepEqual(draft.share?.duplicates, []);
});

test('the transaction ID goes into the notes so a later import can recognise it', () => {
  assert.equal(buildNotes({ ...full, app: 'phonepe', note: null }), 'PhonePe · Ref 123456789012');
  assert.equal(buildNotes({ ...full, app: 'other', referenceId: null, note: 'rent' }), 'rent');
  assert.equal(buildNotes({ ...full, app: null, referenceId: null, note: null }), null);
});

test('the blank "add it by hand" form is tied to the screenshot but claims nothing was read', () => {
  const draft = manualDraft('item-9');
  assert.equal(draft.amount, 0);
  assert.equal(draft.date, null);
  assert.deepEqual(draft.share, { itemId: 'item-9', manual: true, app: null, status: null, warnings: [], duplicates: [] });
});

// ── what the person must confirm ────────────────────────────────────────────────────────────────────────────────

const match = (strength: DuplicateMatch['strength']): DuplicateMatch => ({ id: 'x', date: '2026-10-12', amount: 250, description: 'Raju', strength });
const info = (over: Partial<NonNullable<ReturnType<typeof draftOf>['share']>> = {}) => ({ ...draftOf(full).share!, ...over });

test('a clean import needs no confirmation', () => {
  assert.deepEqual(confirmReasons(info()), []);
});

test('a failed or pending status needs a yes before saving', () => {
  assert.deepEqual(confirmReasons(info({ status: 'failed' })), ['statusFailed']);
  assert.deepEqual(confirmReasons(info({ status: 'pending' })), ['statusPending']);
});

test('a probable or certain duplicate needs a yes; a merely possible one is only shown', () => {
  assert.deepEqual(confirmReasons(info({ duplicates: [match('certain')] })), ['duplicate']);
  assert.deepEqual(confirmReasons(info({ duplicates: [match('likely')] })), ['duplicate']);
  assert.deepEqual(confirmReasons(info({ duplicates: [match('possible')] })), []);
});

test('after the amount or date is edited, an amount-and-day match no longer stands but a matching ID still does', () => {
  assert.deepEqual(confirmReasons(info({ duplicates: [match('likely')] }), false), []);
  assert.deepEqual(confirmReasons(info({ duplicates: [match('certain')] }), false), ['duplicate']);
});

test('several reasons are all asked about, in one list', () => {
  assert.deepEqual(confirmReasons(info({ status: 'failed', duplicates: [match('likely')] })), ['statusFailed', 'duplicate']);
});

// ── failures ────────────────────────────────────────────────────────────────────────────────────────────────────

test('request failures map to the few reasons the screen words', () => {
  assert.equal(codeForApiFailure(0, false), 'network');
  assert.equal(codeForApiFailure(0, true), 'timeout');
  assert.equal(codeForApiFailure(401, false), 'session');
  assert.equal(codeForApiFailure(408, false), 'timeout');
  assert.equal(codeForApiFailure(504, false), 'timeout');
  assert.equal(codeForApiFailure(413, false), 'tooLarge');
  assert.equal(codeForApiFailure(415, false), 'unsupportedType');
  assert.equal(codeForApiFailure(500, false), 'server');
  assert.equal(codeForApiFailure(400, false), 'server');
});

test('"try again" is offered only where trying again can change the outcome', () => {
  assert.equal(canRetry({ error: 'network', fileUri: 'file:///a' }), true);
  assert.equal(canRetry({ error: 'timeout', fileUri: 'file:///a' }), true);
  assert.equal(canRetry({ error: 'server', fileUri: 'file:///a' }), true);
  assert.equal(canRetry({ error: 'unreadable', fileUri: null }), true); // the copy can be made again
  assert.equal(canRetry({ error: 'unreadable', fileUri: 'file:///a' }), false); // the copy itself is gone
  for (const error of ['unsupportedType', 'tooLarge', 'notPayment', 'session'] as const) assert.equal(canRetry({ error, fileUri: null }), false);
  assert.equal(canRetry({ error: null, fileUri: null }), false);
});
