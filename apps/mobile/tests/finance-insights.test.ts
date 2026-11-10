import assert from 'node:assert/strict';
import { test } from 'node:test';

import { budgetLevel, dailySpend, daysLeftInMonth, groupByDay, percentChange, spendByCategory } from '../src/components/finance/insights.ts';

const tx = (type: string, category: string, amount: string | number, date: string) => ({ type, category, amount, date });

test('spendByCategory sums expenses per category, largest first, and ignores other types', () => {
  const { slices, total } = spendByCategory([
    tx('expense', 'Food', '100', '2026-10-01'),
    tx('expense', 'Food', 50, '2026-10-02'),
    tx('expense', 'Rent', '400', '2026-10-01'),
    tx('income', 'Salary', '9000', '2026-10-01'),
    tx('investment', 'Stocks', '700', '2026-10-01'),
    tx('expense', 'Bills', 'abc', '2026-10-01'),
  ]);
  assert.deepEqual(slices, [
    { category: 'Rent', value: 400 },
    { category: 'Food', value: 150 },
  ]);
  assert.equal(total, 550);
});

test('spendByCategory folds the smallest categories into one trailing slice', () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c, i) => tx('expense', c, (7 - i) * 10, '2026-10-01'));
  const { slices, total } = spendByCategory(rows, 4);
  assert.equal(slices.length, 4);
  assert.deepEqual(
    slices.map((s) => s.category),
    ['A', 'B', 'C', null],
  );
  assert.equal(slices[3].value, 40 + 30 + 20 + 10);
  assert.equal(
    slices.reduce((sum, s) => sum + s.value, 0),
    total,
  );
});

test('spendByCategory of nothing is empty', () => {
  assert.deepEqual(spendByCategory([]), { slices: [], total: 0 });
});

test('dailySpend puts each expense on its day and ignores other months and types', () => {
  const series = dailySpend(
    [
      tx('expense', 'Food', '10', '2026-10-01'),
      tx('expense', 'Food', '5', '2026-10-01'),
      tx('expense', 'Food', '20', '2026-10-03'),
      tx('expense', 'Food', '99', '2026-09-03'),
      tx('income', 'Salary', '99', '2026-10-02'),
      tx('expense', 'Food', '99', '2026-10-09'),
    ],
    '2026-10',
    4,
  );
  assert.deepEqual(series, [15, 0, 20, 0]);
});

test('groupByDay groups neighbours and nets income against expenses and investments, skipping transfers', () => {
  const groups = groupByDay([
    tx('income', 'Salary', '1000', '2026-10-05'),
    tx('expense', 'Food', '200', '2026-10-05'),
    tx('transfer', 'Other', '5000', '2026-10-05'),
    tx('investment', 'SIP', '300', '2026-10-04'),
    tx('expense', 'Food', '50', '2026-10-03'),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.date, g.items.length, g.net]),
    [
      ['2026-10-05', 3, 800],
      ['2026-10-04', 1, -300],
      ['2026-10-03', 1, -50],
    ],
  );
});

test('daysLeftInMonth counts today and is null for other months', () => {
  assert.equal(daysLeftInMonth('2026-10', new Date(2026, 9, 17)), 15);
  assert.equal(daysLeftInMonth('2026-10', new Date(2026, 9, 31)), 1);
  assert.equal(daysLeftInMonth('2026-09', new Date(2026, 9, 17)), null);
  assert.equal(daysLeftInMonth('nonsense', new Date(2026, 9, 17)), null);
});

test('percentChange compares with last month and refuses an empty base', () => {
  assert.equal(percentChange(120, 100), 20);
  assert.equal(percentChange(80, 100), -20);
  assert.equal(percentChange(100, 0), null);
  assert.equal(percentChange(Number.NaN, 100), null);
});

test('budgetLevel follows the server flags and anything past 100 percent', () => {
  assert.equal(budgetLevel({ isOverBudget: true, isNearLimit: false, percentage: 90 }), 'over');
  assert.equal(budgetLevel({ isOverBudget: false, isNearLimit: false, percentage: 130 }), 'over');
  assert.equal(budgetLevel({ isOverBudget: false, isNearLimit: true, percentage: 85 }), 'near');
  assert.equal(budgetLevel({ isOverBudget: false, isNearLimit: false, percentage: 85 }), 'ok');
});
