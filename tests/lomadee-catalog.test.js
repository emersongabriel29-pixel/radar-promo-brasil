import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyLomadeeProduct, selectDiverseLomadeeProducts } from '../lib/lomadee-catalog.js';

test('classifica armários pela informação do título mesmo se a descrição citar tecnologia', () => {
  const result = classifyLomadeeProduct({
    name: 'Armário de Cozinha Completa com Balcão',
    description: 'Descrição comercial com referência a monitoramento de estoque.',
    categories: [],
    options: [{ name: 'Armário de Cozinha Completa com Balcão', available: true, categories: [] }]
  });
  assert.equal(result.category, 'Casa e cozinha');
  assert.equal(result.blocked, false);
});

test('usa o slug da URL apenas como apoio para nomes curtos de variação', () => {
  const result = classifyLomadeeProduct({
    name: 'Morango',
    url: 'https://loja.example/produtos/100-whey-protein-morango',
    options: [{ name: 'Morango', available: true }]
  });
  assert.equal(result.category, 'Esporte e lazer');
  assert.equal(result.confidence, 0.72);
});

test('não força classificação quando o título é curto e a URL não explica o produto', () => {
  const result = classifyLomadeeProduct({
    name: 'U',
    url: 'https://loja.example/products/u',
    options: [{ name: 'U', available: true }]
  });
  assert.equal(result.category, 'Ofertas gerais');
  assert.equal(result.subcategory, 'A classificar');
});

test('bloqueia medicamentos antes da seleção de ofertas', () => {
  const result = classifyLomadeeProduct({
    name: 'Dipirona 500mg comprimidos',
    description: 'Medicamento para uso oral',
    url: 'https://loja.example/dipirona'
  });
  assert.equal(result.blocked, true);
  assert.equal(result.rule, 'medication-safety');
});

test('seleciona catálogo diversificado, limita concentração por anunciante/categoria e remove duplicatas', () => {
  const candidates = [
    { product: { id: 'a1', organizationId: 'org-a' }, classification: { category: 'Casa e cozinha' } },
    { product: { id: 'a2', organizationId: 'org-a' }, classification: { category: 'Casa e cozinha' } },
    { product: { id: 'a3', organizationId: 'org-a' }, classification: { category: 'Casa e cozinha' } },
    { product: { id: 'b1', organizationId: 'org-b' }, classification: { category: 'Casa e cozinha' } },
    { product: { id: 'b2', organizationId: 'org-b' }, classification: { category: 'Moda e beleza' } },
    { product: { id: 'c1', organizationId: 'org-c' }, classification: { category: 'Moda e beleza' } },
    { product: { id: 'd1', organizationId: 'org-d' }, classification: { category: 'Bebês e crianças' } },
    { product: { id: 'd1', organizationId: 'org-d' }, classification: { category: 'Bebês e crianças' } }
  ];
  const selected = selectDiverseLomadeeProducts(candidates, { maxItems: 12, maxPerOrganization: 2, maxPerCategory: 3 });
  assert.equal(selected.length, 6);
  assert.equal(selected.filter(x => x.product.organizationId === 'org-a').length, 2);
  assert.equal(selected.filter(x => x.classification.category === 'Casa e cozinha').length, 3);
  assert.equal(new Set(selected.map(x => x.product.id)).size, selected.length);
});

test('job distribui a leitura por páginas e persiste a classificação no banco', async () => {
  const job = await readFile('api/jobs/lomadee.js', 'utf8');
  assert.match(job, /pagesPerRun/);
  assert.match(job, /pageStride/);
  assert.match(job, /maxPerOrganization/);
  assert.match(job, /classification_tags/);
  assert.match(job, /source_category/);
  assert.match(job, /status='VALIDATED'/);
  assert.doesNotMatch(job, /status IN \('VALIDATED','READ_ONLY_VALIDATED'\)/);
});

test('importação manual também grava categoria e bloqueia medicamentos', async () => {
  const integration = await readFile('api/integrations/lomadee.js', 'utf8');
  assert.match(integration, /classifyLomadeeProduct/);
  assert.match(integration, /classification\.blocked/);
  assert.match(integration, /classification_tags/);
  assert.match(integration, /source_category/);
});
