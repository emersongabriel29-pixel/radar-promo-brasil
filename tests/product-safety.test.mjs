import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdultProduct, isMedicationProduct } from '../lib/product-safety.js';

test('detects adult products for restricted affiliate handling', () => {
  for (const title of [
    'Vibrador íntimo recarregável',
    'Vibrador deusa inquebrável, brinquedo de vibração forte, produtos sexuais',
    'Massageador íntimo rosa 3 em 1 recarregável',
    'Calcinha Tailandesa Fio Dental Pérola Massageadora',
    'Massageador íntimo feminino',
    'Lubrificante íntimo à base de água',
    'Gel lubrificante',
    'Anel peniano',
    'Plug anal',
    'Lingerie sensual'
  ]) assert.equal(isAdultProduct({ title }), true, title);
});

test('does not flag phone vibration replacement parts as adult products', () => {\n  assert.equal(isAdultProduct({ title: 'Vibrador Vibra Call Compatível Galaxy S20 FE Peça de Reposição' }), false);\n});\n\ntest('does not treat contraceptive-only products as adult products', () => {
  assert.equal(isAdultProduct({ title: 'Preservativo masculino' }), false);
  assert.equal(isAdultProduct({ title: 'Camisinha lubrificada' }), false);
});

test('keeps medication blocking independent from adult-product classification', () => {
  assert.equal(isMedicationProduct({ title: 'Dipirona 500 mg' }), true);
  assert.equal(isAdultProduct({ title: 'Dipirona 500 mg' }), false);
});
