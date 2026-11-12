import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProduct, CATEGORY_RULES_VERSION } from '../lib/category-classifier.js';
import { classifyLomadeeProduct } from '../lib/lomadee-catalog.js';

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

test('armários domésticos são classificados pelo título apesar da categoria errada da API', () => {
  const cases = [
    'Armário Aéreo de Cozinha 60 cm 1 Porta com Nicho Forno MDF',
    'Armário Aéreo Escritório 1 Porta Miami Carraro',
    'Armário Aéreo 3 Portas em MDF para Lavanderia',
    'Armário de Banheiro 2 Portas Branco'
  ];
  for (const title of cases) {
    const result = classifyProduct({ title, sourceCategory: 'Tecnologia' });
    assert.equal(result.category, 'Casa & Lar', title);
    assert.equal(result.subcategory, 'Móveis e organização', title);
    assert.equal(result.needsReview, true, title);
    assert.equal(result.reason, 'keyword_match_source_conflict', title);
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

test('versão da taxonomia foi atualizada', () => {
  assert.equal(CATEGORY_RULES_VERSION, '1.5.0');
});