import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShopeeKeywordCatalog, selectShopeeKeywords, shopeeKeywordCatalogSize, isRelevantShopeeProduct } from '../lib/shopee-keywords.js';

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

test('keyword relevance rejects fuzzy notebook matches and keeps real product matches', () => {
  assert.equal(isRelevantShopeeProduct('Papel Fotográfico 180g Glossy A4', 'notebook'), false);
  assert.equal(isRelevantShopeeProduct('Kit 300 Folhas Notas Adesivas', 'notebook'), false);
  assert.equal(isRelevantShopeeProduct('Notebook Lenovo IdeaPad Intel i5', 'notebook intel i5'), true);
  assert.equal(isRelevantShopeeProduct('Laptop Dell Inspiron', 'notebook'), true);
  assert.equal(isRelevantShopeeProduct('Laptop Infantil Notebook Educativo Computador Português e Inglês', 'notebook computador'), false);
  assert.equal(isRelevantShopeeProduct('Gabinete Gamer Aquário Aigo Apollo', 'notebook gamer'), false);
  assert.equal(isRelevantShopeeProduct('Smartphone Motorola Moto G06', 'smartphone'), true);
  assert.equal(isRelevantShopeeProduct('Forma de silicone para fritadeira', 'air fryer'), true);
});
