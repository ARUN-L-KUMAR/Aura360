import assert from 'node:assert/strict';
import { test } from 'node:test';

import { wardrobeStats, type WardrobePiece } from '../src/components/home/widgets/wardrobe-stats.ts';

const piece = (name: string, extra: Partial<WardrobePiece> = {}): WardrobePiece => ({ name, status: 'wardrobe', price: null, wearCount: 0, condition: null, ...extra });

test('only pieces in the wardrobe count', () => {
  const stats = wardrobeStats([
    piece('Jeans', { price: 3999, wearCount: 31 }),
    piece('Wishlist coat', { status: 'wishlist', price: 9000, wearCount: 50 }),
    piece('Sold shirt', { status: 'sold', price: 1200, wearCount: 9, condition: 'needs_wash' }),
    piece('Donated tee', { status: 'donated', price: 500 }),
  ]);
  assert.equal(stats.pieces, 1);
  assert.equal(stats.value, 3999);
  assert.equal(stats.wears, 31);
  assert.equal(stats.needsWash, 0);
  assert.deepEqual(
    stats.mostWorn.map((p) => p.name),
    ['Jeans'],
  );
});

test('value adds prices that arrive as numbers or text and ignores the rest', () => {
  const stats = wardrobeStats([
    piece('A', { price: 1000 }),
    piece('B', { price: '2500.50' }),
    piece('C', { price: null }),
    piece('D', { price: 'free' }),
    piece('E', { price: -40 }),
    piece('F'),
  ]);
  assert.equal(stats.pieces, 6);
  assert.equal(stats.value, 3500.5);
});

test('wears add up and a missing count is zero', () => {
  const stats = wardrobeStats([piece('A', { wearCount: 4 }), piece('B', { wearCount: null }), piece('C', { wearCount: 10 }), piece('D', { wearCount: -3 })]);
  assert.equal(stats.wears, 14);
});

test('counts the pieces waiting for a wash', () => {
  const stats = wardrobeStats([piece('A', { condition: 'needs_wash' }), piece('B', { condition: 'good' }), piece('C', { condition: 'needs_wash' }), piece('D', { condition: 'needs_repair' })]);
  assert.equal(stats.needsWash, 2);
});

test('most worn: the top three, most first, worn pieces only', () => {
  const stats = wardrobeStats([
    piece('Never worn', { wearCount: 0 }),
    piece('Fourth', { wearCount: 2 }),
    piece('Second', { wearCount: 24 }),
    piece('First', { wearCount: 31 }),
    piece('Third', { wearCount: 7 }),
  ]);
  assert.deepEqual(
    stats.mostWorn.map((p) => p.name),
    ['First', 'Second', 'Third'],
  );
});

test('most worn: ties go by name, then by their order in the list', () => {
  const stats = wardrobeStats([piece('Zebra tee', { wearCount: 5 }), piece('Apple shirt', { wearCount: 5 }), piece('Apple shirt', { wearCount: 5, price: 1 }), piece('Mid', { wearCount: 9 })]);
  assert.deepEqual(
    stats.mostWorn.map((p) => [p.name, p.price]),
    [
      ['Mid', null],
      ['Apple shirt', null],
      ['Apple shirt', 1],
    ],
  );
});

test('the number of most worn pieces can be changed, and never goes below zero', () => {
  const items = [piece('A', { wearCount: 3 }), piece('B', { wearCount: 2 }), piece('C', { wearCount: 1 })];
  assert.equal(wardrobeStats(items, 2).mostWorn.length, 2);
  assert.equal(wardrobeStats(items, 10).mostWorn.length, 3);
  assert.equal(wardrobeStats(items, -1).mostWorn.length, 0);
});

test('an empty wardrobe is all zeros', () => {
  assert.deepEqual(wardrobeStats([]), { pieces: 0, value: 0, wears: 0, needsWash: 0, mostWorn: [] });
});

test('keeps the full item type for the most worn pieces', () => {
  const items = [{ ...piece('Tee', { wearCount: 2 }), id: 'a1' }];
  const [first] = wardrobeStats(items).mostWorn;
  assert.equal(first.id, 'a1');
});

test('does not change the list it is given', () => {
  const items = [piece('B', { wearCount: 1 }), piece('A', { wearCount: 9 })];
  wardrobeStats(items);
  assert.deepEqual(
    items.map((p) => p.name),
    ['B', 'A'],
  );
});
