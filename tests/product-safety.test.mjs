import test from 'node:test';
import assert from 'node:assert/strict';
import { isMedicationProduct } from '../lib/product-safety.js';

test('bloqueia medicamentos por nome comercial e princípio ativo', () => {
  for (const title of [
    'Dipirona 500 mg comprimidos',
    'Paracetamol para dor e febre',
    'Amoxicilina 500mg',
    'Ozempic semaglutida',
    'Clonazepam medicamento controlado',
    'Remédio para gripe',
    'Antibiótico de uso oral'
  ]) assert.equal(isMedicationProduct({ title }), true, title);
});

test('bloqueia medicamento descrito na descrição ou URL', () => {
  assert.equal(isMedicationProduct({ title: 'Produto de saúde', description: 'medicamento anti-inflamatório' }), true);
  assert.equal(isMedicationProduct({ title: 'Oferta', product_url: 'https://loja.example/remedio-controlado' }), true);
});

test('não bloqueia itens comuns de cuidados pessoais nem produtos infantis', () => {
  for (const title of [
    'Shampoo hidratante',
    'Creme facial para skincare',
    'Fralda infantil',
    'Termômetro digital',
    'Organizador de medicamentos vazio'
  ]) assert.equal(isMedicationProduct({ title }), false, title);
});
