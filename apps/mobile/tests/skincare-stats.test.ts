import assert from 'node:assert/strict';
import { test } from 'node:test';

import { routineFor, skincareStats, type SkincareProduct } from '../src/features/skincare/types.ts';

const product = (id: string, extra: Partial<SkincareProduct> = {}): SkincareProduct => ({ id, productName: id, category: 'Serum', ...extra });

test('skincareStats counts routines, statuses and averages only the ratings that exist', () => {
  const products = [
    product('a', { routineTime: 'both', rating: 5 }),
    product('b', { routineTime: 'morning', rating: 4 }),
    product('c', { routineTime: 'evening', status: 'need_to_buy', rating: null }),
    product('d', { routineTime: 'weekly', status: 'finished', rating: 3 }),
  ];
  const stats = skincareStats(products);
  assert.equal(stats.total, 4);
  assert.equal(stats.needToBuy, 1);
  assert.equal(stats.finished, 1);
  assert.equal(stats.ratedCount, 3);
  assert.equal(stats.averageRating, 4);
});

test('skincareStats has no average when nothing is rated, and handles an empty shelf', () => {
  assert.equal(skincareStats([product('a', { rating: 0 })]).averageRating, null);
  const empty = skincareStats([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.averageRating, null);
});

test('routineFor orders by routineOrder and counts "both" in each routine', () => {
  const products = [product('late', { routineTime: 'morning', routineOrder: 3 }), product('both', { routineTime: 'both', routineOrder: 1 }), product('night', { routineTime: 'evening' })];
  assert.deepEqual(routineFor(products, 'morning').map((p) => p.id), ['both', 'late']);
  assert.deepEqual(routineFor(products, 'evening').map((p) => p.id), ['both', 'night']);
});
