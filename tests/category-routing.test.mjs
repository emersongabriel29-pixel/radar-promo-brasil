import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCanonicalCategory } from '../lib/category-routing.js';

test('prefers the canonical Moda e Beleza category ID over duplicate labels', () => {
  const rows = [
    { id: '61fa87df-6c4d-46e2-b88b-4cfe6d0761ea', name: 'Moda e beleza' },
    { id: 'cat-beleza', name: 'Moda e beleza' }
  ];
  assert.equal(resolveCanonicalCategory(rows, 'Moda e beleza').id, 'cat-beleza');
});

test('resolves category names regardless of accents and case', () => {
  const rows = [{ id: 'cat-beleza', name: 'Moda e beleza' }];
  assert.equal(resolveCanonicalCategory(rows, 'MODA E BELEZA').id, 'cat-beleza');
});

test('uses the stable category ID before a duplicate fallback row', () => {
  const rows = [
    { id: 'uuid-duplicate', name: 'Ofertas gerais' },
    { id: 'cat-gerais', name: 'Ofertas gerais' }
  ];
  assert.equal(resolveCanonicalCategory(rows, 'Ofertas gerais').id, 'cat-gerais');
});

test('returns null rather than assigning an unrelated category when no match exists', () => {
  assert.equal(resolveCanonicalCategory([], 'Moda e beleza'), null);
});
