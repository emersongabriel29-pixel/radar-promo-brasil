import { canEnterOfferFlow } from '../lib/offer-flow-policy.js';
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
  assert.equal(result.category, 'Casa & Lar');
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
  assert.equal(result.needsReview, true);
  assert.equal(result.rule, 'shared-product-url-slug');
});

test('reconhece sabores de whey pelo slug do produto, não como alimento comum', () => {
  const result = classifyLomadeeProduct({
    name: 'Chocolate',
    url: 'https://loja.example/produtos/100-whey-double-tasty-chocolate',
    options: [{ name: 'Chocolate', available: true }]
  });
  assert.equal(result.category, 'Esporte e lazer');
  assert.equal(result.confidence, 0.72);
  assert.equal(result.needsReview, true);
  assert.equal(result.rule, 'shared-product-url-slug');
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

test('preserva classificação de medicamento e exclui somente a publicação', () => {
  const result = classifyLomadeeProduct({
    name: 'Dipirona 500mg comprimidos',
    description: 'Medicamento para uso oral',
    url: 'https://loja.example/dipirona'
  });
  assert.equal(result.blocked, false);
  assert.equal(canEnterOfferFlow({title:'Dipirona 500mg comprimidos',current_price:1000,affiliate_url:'https://example.com/afiliado'}).eligible,false);
});

test('seleciona catálogo diversificado, limita concentração por anunciante/categoria e remove duplicatas', () => {
  const candidates = [
    { product: { id: 'a1', organizationId: 'org-a' }, classification: { category: 'Casa & Lar' } },
    { product: { id: 'a2', organizationId: 'org-a' }, classification: { category: 'Casa & Lar' } },
    { product: { id: 'a3', organizationId: 'org-a' }, classification: { category: 'Casa & Lar' } },
    { product: { id: 'b1', organizationId: 'org-b' }, classification: { category: 'Casa & Lar' } },
    { product: { id: 'b2', organizationId: 'org-b' }, classification: { category: 'Moda e beleza' } },
    { product: { id: 'c1', organizationId: 'org-c' }, classification: { category: 'Moda e beleza' } },
    { product: { id: 'd1', organizationId: 'org-d' }, classification: { category: 'Bebês e crianças' } },
    { product: { id: 'd1', organizationId: 'org-d' }, classification: { category: 'Bebês e crianças' } }
  ];
  const selected = selectDiverseLomadeeProducts(candidates, { maxItems: 12, maxPerOrganization: 2, maxPerCategory: 3 });
  assert.equal(selected.length, 6);
  assert.equal(selected.filter(x => x.product.organizationId === 'org-a').length, 2);
  assert.equal(selected.filter(x => x.classification.category === 'Casa & Lar').length, 3);
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
