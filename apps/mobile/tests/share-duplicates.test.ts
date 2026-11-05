import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findDuplicates, monthsToCheck, type LedgerEntry } from '../src/features/share-import/duplicates.ts';

const entry = (over: Partial<LedgerEntry> & { id: string }): LedgerEntry => ({
  date: '2026-10-12',
  type: 'expense',
  amount: '250.00',
  description: 'Raju Tea Stall',
  notes: null,
  ...over,
});

const query = { type: 'expense' as const, amount: 250, date: '2026-10-12', counterparty: 'RAJU TEA STALL', referenceId: null };

test('an empty ledger has no duplicates', () => {
  assert.deepEqual(findDuplicates(query, []), []);
});

test('same amount, same day and the same name is a likely duplicate', () => {
  const [match, ...rest] = findDuplicates(query, [entry({ id: 'a' })]);
  assert.equal(rest.length, 0);
  assert.equal(match.id, 'a');
  assert.equal(match.strength, 'likely');
  assert.equal(match.amount, 250);
  assert.equal(match.date, '2026-10-12');
});

test('same amount and day with an unrelated name is only a possible duplicate', () => {
  const [match] = findDuplicates(query, [entry({ id: 'a', description: 'Metro card' })]);
  assert.equal(match.strength, 'possible');
});

test('the next or previous day only counts when the name matches', () => {
  assert.equal(findDuplicates(query, [entry({ id: 'a', date: '2026-10-13' })])[0].strength, 'possible');
  assert.equal(findDuplicates(query, [entry({ id: 'a', date: '2026-10-11' })])[0].strength, 'possible');
  assert.deepEqual(findDuplicates(query, [entry({ id: 'a', date: '2026-10-13', description: 'Metro card' })]), []);
  assert.deepEqual(findDuplicates(query, [entry({ id: 'a', date: '2026-10-14' })]), []);
});

test('a different amount, or income against expense, is not a duplicate', () => {
  assert.deepEqual(findDuplicates(query, [entry({ id: 'a', amount: '251.00' })]), []);
  assert.deepEqual(findDuplicates(query, [entry({ id: 'a', type: 'income' })]), []);
});

test('amounts compare to the paisa, whether the ledger stores a string or a number', () => {
  assert.equal(findDuplicates({ ...query, amount: 99.99 }, [entry({ id: 'a', amount: '99.99' })]).length, 1);
  assert.equal(findDuplicates({ ...query, amount: 99.99 }, [entry({ id: 'a', amount: 99.99 })]).length, 1);
  assert.equal(findDuplicates({ ...query, amount: 99.99 }, [entry({ id: 'a', amount: '99.98' })]).length, 0);
});

test('the same transaction ID is certain, wherever it was written and whatever amount or date was typed', () => {
  const withRef = { ...query, referenceId: '123456789012', amount: 999, date: '2026-09-01' };
  const inNotes = entry({ id: 'n', notes: 'Google Pay · Ref 123456789012', amount: '5.00' });
  const inDescription = entry({ id: 'd', description: 'rent 123456789012' });
  assert.deepEqual(findDuplicates(withRef, [inNotes]).map((m) => [m.id, m.strength]), [['n', 'certain']]);
  assert.deepEqual(findDuplicates(withRef, [inDescription]).map((m) => [m.id, m.strength]), [['d', 'certain']]);
});

test('a transaction ID is compared case-insensitively and a short one proves nothing', () => {
  assert.equal(findDuplicates({ ...query, referenceId: 'T2610121234ABC' }, [entry({ id: 'a', notes: 'ref t2610121234abc' })])[0].strength, 'certain');
  const short = findDuplicates({ ...query, referenceId: '1234', amount: 1 }, [entry({ id: 'a', notes: 'bus 1234', amount: '9' })]);
  assert.deepEqual(short, []);
});

test('results are ordered by strength, capped at three, and never include the same entry twice', () => {
  const ledger = [
    entry({ id: 'possible', description: 'Metro card' }),
    entry({ id: 'likely' }),
    entry({ id: 'certain', notes: 'Ref 555666777888', amount: '1' }),
    entry({ id: 'extra1', description: 'Metro card 2' }),
    entry({ id: 'extra2', description: 'Metro card 3' }),
  ];
  const matches = findDuplicates({ ...query, referenceId: '555666777888' }, ledger);
  assert.equal(matches.length, 3);
  assert.deepEqual(matches.map((m) => m.strength), ['certain', 'likely', 'possible']);
  assert.equal(new Set(matches.map((m) => m.id)).size, 3);
});

test('without a date only a matching name makes a possible duplicate', () => {
  const noDate = { ...query, date: null };
  assert.equal(findDuplicates(noDate, [entry({ id: 'a' })])[0].strength, 'possible');
  assert.deepEqual(findDuplicates(noDate, [entry({ id: 'a', description: 'Metro card' })]), []);
});

test('an amount of zero (not found on the screenshot) never matches by amount', () => {
  assert.deepEqual(findDuplicates({ ...query, amount: 0 }, [entry({ id: 'a', amount: '0' })]), []);
});

test('a broken ledger row is skipped, not thrown on', () => {
  assert.deepEqual(findDuplicates(query, [entry({ id: 'a', amount: 'abc' })]), []);
});

test('monthsToCheck covers the day before and after across month and year ends', () => {
  assert.deepEqual(monthsToCheck('2026-10-12'), ['2026-10']);
  assert.deepEqual(monthsToCheck('2026-10-01'), ['2026-09', '2026-10']);
  assert.deepEqual(monthsToCheck('2026-10-31'), ['2026-10', '2026-11']);
  assert.deepEqual(monthsToCheck('2026-01-01'), ['2025-12', '2026-01']);
  assert.deepEqual(monthsToCheck('2026-12-31'), ['2026-12', '2027-01']);
  assert.deepEqual(monthsToCheck('2028-02-29'), ['2028-02', '2028-03']); // a leap day
});
