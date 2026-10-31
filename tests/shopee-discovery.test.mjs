import test from 'node:test';
import assert from 'node:assert/strict';
import { isShopeeShopId, isShopeeItemId } from '../lib/shopee-ids.js';
import { getShopeeKeywordFamily, selectShopeeKeywords } from '../lib/shopee-keywords.js';
import { classifyProduct } from '../lib/category-classifier.js';

test('Shopee shop and item IDs accept decimal Int64 strings without numeric coercion', () => {
  assert.equal(isShopeeShopId('1724979106'), true);
  assert.equal(isShopeeShopId('001724979106'), true);
  assert.equal(isShopeeShopId('1724979106x'), false);
  assert.equal(isShopeeShopId(''), false);
  assert.equal(isShopeeItemId('1589295236'), true);
  assert.equal(isShopeeItemId('1234567'), false);
  assert.equal(isShopeeItemId('9223372036854775807'), true);
  assert.equal(isShopeeItemId('9223372036854775808'), false);
});

test('pajama titles map to the fashion family', () => {
  const result = classifyProduct({ title: 'Pijama Feminino de Algodão' });
  assert.equal(result.category, 'Moda e beleza');
  assert.ok(result.confidence >= 0.8);
});

test('rotating search phrases span product families', () => {
  assert.equal(getShopeeKeywordFamily('top vendas pijama'), 'fashion');
  assert.equal(getShopeeKeywordFamily('oferta mouse sem fio'), 'technology');
  assert.equal(getShopeeKeywordFamily('oferta air fryer'), 'home');
  const selected = selectShopeeKeywords(100, 3);
  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map(getShopeeKeywordFamily)).size, 3);
});
