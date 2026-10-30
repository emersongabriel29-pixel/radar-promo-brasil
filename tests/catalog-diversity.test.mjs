import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProduct } from '../lib/category-classifier.js';
import { selectDiverseCandidates } from '../lib/catalog-diversity.js';
import { isMedicationProduct } from '../lib/product-safety.js';

test('marketplace provider names are not treated as source categories', () => {
  const result = classifyProduct({ title: 'Produto sem categoria identificável', sourceCategory: 'Shopee' });
  assert.equal(result.category, 'Ofertas gerais');
  assert.equal(result.needsReview, true);
  assert.equal(result.confidence, 0.25);
});

test('ambiguous vibrator wording does not classify hardware as sex shop', () => {
  const result = classifyProduct({ title: 'Vibrador Vibra Call Compatível Galaxy S20 FE Peça de Reposição' });
  assert.notEqual(result.category, 'Sex shop');
});

test('explicit intimate products classify as sex shop', () => {
  const result = classifyProduct({ title: 'Vibrador íntimo recarregável para casal' });
  assert.equal(result.category, 'Sex shop');
  assert.equal(result.needsReview, false);
});

test('recognized AliExpress source categories improve classification', () => {
  const result = classifyProduct({ title: 'Produto importado', sourceCategory: 'Phones & Telecommunications' });
  assert.equal(result.category, 'Tecnologia');
  assert.equal(result.reason, 'source_category_match');
});

test('title rules classify pet and home products', () => {
  assert.equal(classifyProduct({ title: 'Ração premium para cachorro adulto' }).category, 'Pet');
  assert.equal(classifyProduct({ title: 'Air Fryer 5 litros digital' }).category, 'Casa e cozinha');
});

test('medicines remain blocked while ordinary accessories are allowed', () => {
  assert.equal(isMedicationProduct({ title: 'Paracetamol 750 mg 20 comprimidos' }), true);
  assert.equal(isMedicationProduct({ title: 'Organizador de comprimidos semanal vazio' }), false);
});

test('candidate selection spreads categories and merchants before filling', () => {
  const candidates = [
    { id: 'a1', classified: { category: 'Tecnologia' }, merchantId: 'shop-a' },
    { id: 'a2', classified: { category: 'Tecnologia' }, merchantId: 'shop-a' },
    { id: 'b1', classified: { category: 'Pet' }, merchantId: 'shop-b' },
    { id: 'c1', classified: { category: 'Casa e cozinha' }, merchantId: 'shop-c' },
    { id: 'd1', classified: { category: 'Moda e beleza' }, merchantId: 'shop-d' }
  ];
  const selected = selectDiverseCandidates(candidates, {
    limit: 4, perCategory: 1, perMerchant: 1, fillPerCategory: 2, fillPerMerchant: 2
  });
  assert.deepEqual(selected.map(item => item.id), ['a1', 'b1', 'c1', 'd1']);
});

test('unclassified products do not block one another from filling the batch', () => {
  const candidates = ['x1', 'x2', 'x3'].map(id => ({ id, classified: { category: 'Ofertas gerais' }, merchantId: id }));
  assert.equal(selectDiverseCandidates(candidates, { limit: 3, perCategory: 1, perMerchant: 1 }).length, 3);
});
