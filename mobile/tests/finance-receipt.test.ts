import assert from 'node:assert/strict';
import { test } from 'node:test';

import { draftFromReceipt, mapReceiptCategory } from '../src/components/finance/receipt.ts';

const scan = { merchant: ' Starbucks ', amount: 412.5, date: '2026-10-12', category: 'Food & Dining', paymentMethod: 'card' as const, notes: null, confidence: 0.9 };

test('maps the vision model categories onto the stored ones', () => {
  assert.equal(mapReceiptCategory('Food & Dining'), 'Food');
  assert.equal(mapReceiptCategory('  utilities & bills '), 'Bills');
  assert.equal(mapReceiptCategory('Transportation'), 'Transport');
  assert.equal(mapReceiptCategory('Something new'), 'Other');
  assert.equal(mapReceiptCategory(undefined), 'Other');
});

test('a clean scan becomes an expense draft', () => {
  assert.deepEqual(draftFromReceipt(scan, '2026-10-19'), {
    type: 'expense',
    amount: 412.5,
    category: 'Food',
    description: 'Starbucks',
    date: '2026-10-12',
    paymentMethod: 'card',
    notes: null,
  });
});

test('bad dates, amounts and payment methods fall back', () => {
  const draft = draftFromReceipt({ ...scan, date: '12/10', amount: Number.NaN, paymentMethod: 'cheque' as never, notes: '  GST 18  ' }, '2026-10-19');
  assert.equal(draft.date, '2026-10-19');
  assert.equal(draft.amount, 0);
  assert.equal(draft.paymentMethod, 'upi');
  assert.equal(draft.notes, 'GST 18');
});
