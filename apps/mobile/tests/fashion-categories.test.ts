import assert from 'node:assert/strict';
import { test } from 'node:test';

import { categoryCountsOf } from '../src/components/fashion/categories.ts';

const item = (category?: string | null) => ({ category });

test('counts known categories in the fixed order, case-insensitively', () => {
  const counts = categoryCountsOf([item('shoes'), item('TOPS'), item('Tops'), item('Accessories')]);
  assert.deepEqual(counts, [
    { category: 'Tops', count: 2 },
    { category: 'Shoes', count: 1 },
    { category: 'Accessories', count: 1 },
  ]);
});

test('other categories follow, most pieces first, then by name', () => {
  const counts = categoryCountsOf([item('Jeans'), item('Clothing'), item('Clothing'), item('Tops'), item('Belts')]);
  assert.deepEqual(
    counts.map((c) => c.category),
    ['Tops', 'Clothing', 'Belts', 'Jeans'],
  );
});

test('blank and missing categories are skipped', () => {
  assert.deepEqual(categoryCountsOf([item(''), item('   '), item(null), item(undefined)]), []);
});

test('keepEmptyKnown lists every known category', () => {
  const counts = categoryCountsOf([item('Shoes')], true);
  assert.deepEqual(
    counts.map((c) => [c.category, c.count]),
    [['Tops', 0], ['Bottoms', 0], ['Shoes', 1], ['Outerwear', 0], ['Accessories', 0]],
  );
});
