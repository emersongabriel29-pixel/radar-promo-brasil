import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdultProduct, isMedicationProduct } from '../lib/product-safety.js';

test('detects adult products for restricted affiliate handling', () => {
  for (const title of [
    'Vibrador íntimo recarregável',
    'Massageador íntimo feminino',
    'Lubrificante íntimo à base de água',
    'Gel lubrificante',
    'Anel peniano',
    'Plug anal',
    'Lingerie sensual'
  ]) assert.equal(isAdultProduct({ title }), true, title);
});

test('does not treat contraceptive-only products as adult products', () => {
  assert.equal(isAdultProduct({ title: 'Preservativo masculino' }), false);
  assert.equal(isAdultProduct({ title: 'Camisinha lubrificada' }), false);
});

test('keeps medication blocking independent from adult-product classification', () => {
  assert.equal(isMedicationProduct({ title: 'Dipirona 500 mg' }), true);
  assert.equal(isAdultProduct({ title: 'Dipirona 500 mg' }), false);
});
