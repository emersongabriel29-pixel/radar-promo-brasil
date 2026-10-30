import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShopeeKeywordCatalog, selectShopeeKeywords, shopeeKeywordCatalogSize } from '../lib/shopee-keywords.js';

test('Shopee keyword catalog expands curated products into thousands of searchable phrases', () => {
  const catalog = buildShopeeKeywordCatalog();
  assert.equal(catalog.length, shopeeKeywordCatalogSize);
  assert.ok(catalog.length >= 5000, 'expected at least 5,000 phrases');
  assert.ok(catalog.includes('smartphone'));
  assert.ok(catalog.includes('oferta smartphone'));
  assert.ok(catalog.includes('smartphone sem fio'));
  assert.ok(catalog.includes('Samsung smartphone'));
  assert.equal(new Set(catalog.map(value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).size, catalog.length);
});

test('keyword rotation is deterministic, bounded, and changes between slots', () => {
  const first = selectShopeeKeywords(100, 6);
  assert.equal(first.length, 6);
  assert.deepEqual(first, selectShopeeKeywords(100, 6));
  assert.notDeepEqual(first, selectShopeeKeywords(101, 6));
  assert.equal(new Set(first).size, first.length);
  assert.equal(selectShopeeKeywords(1, 99).length, 12);
  assert.deepEqual(selectShopeeKeywords(1, 0), []);
});
