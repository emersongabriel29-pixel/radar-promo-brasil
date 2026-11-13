import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProduct, CATEGORY_RULES_VERSION } from '../lib/category-classifier.js';
import { classifyLomadeeProduct } from '../lib/lomadee-catalog.js';
import { isMedicationProduct } from '../lib/product-safety.js';

test('Casa & Lar classifica independentemente da API de origem', () => {
  for (const sourceCategory of ['SHOPEE', 'LOMADEE', 'MERCADO LIVRE', 'ALIEXPRESS', 'MAGALU']) {
    const result = classifyProduct({ title: 'Air fryer 5 litros digital', sourceCategory });
    assert.equal(result.category, 'Casa & Lar');
    assert.equal(result.subcategory, 'Eletroportáteis de cozinha');
    assert.equal(result.needsReview, false);
  }
});

test('reconhece subcategorias ampliadas de Casa & Lar', () => {
  const cases = [
    ['Jogo americano 6 peças com sousplat', 'Mesa posta e servir'],
    ['Cesto organizador para armário', 'Organização e armazenamento'],
    ['Câmera Wi-Fi residencial com visão noturna', 'Segurança e automação residencial'],
    ['Furadeira de impacto DEWALT 20V', 'Construção, reforma e ferramentas domésticas']
  ];
  for (const [title, subcategory] of cases) {
    const result = classifyProduct({ title, sourceCategory: 'Shopee' });
    assert.equal(result.category, 'Casa & Lar', title);
    assert.equal(result.subcategory, subcategory, title);
  }
});

test('ferramentas específicas para bicicleta não caem em Casa & Lar', () => {
  const result = classifyProduct({ title: 'Chave de torque para bicicleta e ciclismo' });
  assert.equal(result.category, 'Esporte e lazer');
  assert.equal(result.subcategory, 'Ciclismo e manutenção de bicicletas');
});

test('preserva categorias externas a Casa & Lar', () => {
  assert.equal(classifyProduct({ title: 'Smartphone Motorola Edge 50' }).category, 'Tecnologia');
  assert.equal(classifyProduct({ title: 'Capacete para moto articulado' }).category, 'Auto, Moto & Peças');
  assert.equal(classifyProduct({ title: 'Pneu aro 15 para carro' }).category, 'Auto, Moto & Peças');
});

test('produto ambíguo continua em revisão', () => {
  const result = classifyProduct({ title: 'Produto premium multiuso' });
  assert.equal(result.category, 'Ofertas gerais');
  assert.equal(result.needsReview, true);
});

test('categoria informada pela API é apenas sugestão quando o produto não identifica a categoria', () => {
  const result = classifyProduct({ title: 'Produto misterioso multiuso', sourceCategory: 'Home & Garden' });
  assert.equal(result.category, 'Casa & Lar');
  assert.equal(result.needsReview, true);
  assert.equal(result.reason, 'source_category_suggestion_only');
});

test('conflito entre título do produto e categoria da API exige revisão', () => {
  const result = classifyProduct({ title: 'Smartphone Motorola Edge 50', sourceCategory: 'Home & Garden' });
  assert.equal(result.category, 'Tecnologia');
  assert.equal(result.needsReview, true);
  assert.equal(result.reason, 'keyword_match_source_conflict');
});

test('Lomadee não usa rótulo de categoria da API como evidência automática', () => {
  const result = classifyLomadeeProduct({
    name: 'Produto misterioso multiuso sem identificação',
    categories: ['Home & Garden'],
    url: 'https://loja.example/produto-misterioso-multiuso-sem-identificacao'
  });
  assert.equal(result.category, 'Casa & Lar');
  assert.equal(result.needsReview, true);
  assert.equal(result.rule, 'shared-classifier-review');
});

test('unhas e manicure vencem palavras incidentais de decoração doméstica', () => {
  const result = classifyProduct({ title: '550 pçs dicas de unhas de gel ferramenta de extensão acrílica manicure francesa decoração' });
  assert.equal(result.category, 'Moda e beleza');
  assert.equal(result.subcategory, 'Unhas e manicure');
  assert.equal(result.reason, 'specific_nail_beauty_match');
});

test('produtos automotivos claros não caem em Casa & Lar', () => {
  const cases = [
    ['Cheirinho Para Carro Aromatizador Ar Condicionado Perfume', 'specific_automotive_accessory_match'],
    ['Escova Desembaçadora de Para-brisa Automotivo para Carro e Casa', 'specific_automotive_cleaning_match'],
    ['Escova de pó para interior de carro e painel automotivo', 'specific_automotive_cleaning_match']
  ];
  for (const [title, reason] of cases) {
    const result = classifyProduct({ title });
    assert.equal(result.category, 'Auto, Moto & Peças', title);
    assert.equal(result.reason, reason, title);
  }
});

test('eletrodoméstico doméstico permanece em Casa & Lar', () => {
  const result = classifyProduct({ title: 'Freezer e Conservador Horizontal HQ 105 Litros Preto' });
  assert.equal(result.category, 'Casa & Lar');
});

test('marcas e dosagens de medicamentos são bloqueadas', () => {
  for (const title of [
    'Allegra D 60mg/120mg 10 Comprimidos',
    'Allestra 20 75mcg/20mcg 63 Comprimidos',
    'Adipept 20mg 28 Comprimidos',
    'Dipirona 1g 10 Comprimidos',
    'Allexofedrin Pediátrico 6mg/ml Suspensão Oral',
    'Bravecto 500 MG para cães'
  ]) {
    assert.equal(isMedicationProduct({ title }), true, title);
    assert.equal(classifyLomadeeProduct({ name: title }).blocked, true, title);
  }
});

test('organizador porta-comprimidos sem medicamento não é bloqueado', () => {
  assert.equal(isMedicationProduct({ title: 'Porta comprimidos organizador semanal' }), false);
});

test('versão da taxonomia foi atualizada', () => {
  assert.equal(CATEGORY_RULES_VERSION, '1.6.0');
});