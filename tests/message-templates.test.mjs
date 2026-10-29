import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMessageTemplate, renderMessageTemplate } from '../lib/message-templates.js';

test('valida modelo com variáveis permitidas e renderiza sem HTML ou interpolação executável', () => {
  const template = validateMessageTemplate({ name: 'Oferta do dia', body: '🔥 {{produto}} por {{preco}} — {{link_afiliado}}' });
  assert.equal(template.ok, true);
  assert.deepEqual(template.tokens, ['produto', 'preco', 'link_afiliado']);
  assert.equal(renderMessageTemplate(template.body, { produto: '<Air Fryer>', preco: 'R$ 99,90', link_afiliado: 'https://example.com/?a=1' }), '🔥 <Air Fryer> por R$ 99,90 — https://example.com/?a=1');
});

test('rejeita modelo sem nome ou conteúdo', () => {
  assert.equal(validateMessageTemplate({ name: '', body: 'texto' }).ok, false);
  assert.equal(validateMessageTemplate({ name: 'Vazio', body: '  ' }).ok, false);
});

test('rejeita placeholders desconhecidos e incompletos', () => {
  assert.equal(validateMessageTemplate({ name: 'Inválido', body: '{{segredo}}' }).ok, false);
  assert.equal(validateMessageTemplate({ name: 'Inválido', body: '{{produto' }).ok, false);
});

test('limita nome e corpo antes de persistir', () => {
  assert.equal(validateMessageTemplate({ name: 'x'.repeat(81), body: 'texto' }).ok, false);
  assert.equal(validateMessageTemplate({ name: 'Limite', body: 'x'.repeat(3001) }).ok, false);
});
