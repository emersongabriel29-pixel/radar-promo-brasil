import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProduct, categoryHint } from '../lib/category-classifier.js';

test('classifies intimate products before broad fashion terms', () => {
  assert.equal(classifyProduct({ title: 'Lingerie sensual com vibrador íntimo recarregável' }).category, 'Sex shop');
  assert.equal(classifyProduct({ title: 'Lubrificante íntimo à base de água' }).subcategory, 'Lubrificantes e géis');
});

test('does not classify every product from a marketplace as imported goods', () => {
  assert.equal(categoryHint('Fone Bluetooth', 'AliExpress'), 'Tecnologia');
  assert.equal(categoryHint('Liquidificador 2 litros', 'Shopee'), 'Casa e cozinha');
  assert.equal(classifyProduct({title:'Produto sem categoria',sourceCategory:'Shopee'}).needsReview,true);
});

test('returns a review-needed fallback when there is no reliable category signal', () => {
  const result = classifyProduct({ title: 'Produto modelo XYZ 2026' });
  assert.equal(result.category, 'Ofertas gerais');
  assert.equal(result.needsReview, true);
  assert.ok(result.confidence < 0.5);
});

test('does not confuse phone vibration replacement parts with intimate products', () => {
  const result = classifyProduct({ title: 'Vibrador Vibra Call Compatível Galaxy S20 FE Peça de Reposição' });
  assert.notEqual(result.category, 'Sex shop');
  assert.equal(result.reason, 'no_reliable_match');
});

test('exposes stable tags and a reason for traceability', () => {
  const result = classifyProduct({ title: 'Vibrador íntimo recarregável' });
  assert.ok(result.tags.includes('sex-shop'));
  assert.equal(result.reason, 'keyword_match');
});

test('classifies pajamas and sleepwear as fashion with high confidence', () => {
  const result = classifyProduct({ title: 'Pijama Feminino de Algodão com Calça e Blusa' });
  assert.equal(result.category, 'Moda e beleza');
  assert.equal(result.subcategory, 'Moda');
  assert.ok(result.confidence >= 0.8);
  assert.equal(result.needsReview, false);
});
