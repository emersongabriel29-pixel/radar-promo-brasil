import test from 'node:test';
import assert from 'node:assert/strict';
import { constantTimeSecretMatch, isPlainObject, safePublicError } from '../lib/api-security.js';

test('segredo do webhook só aceita correspondência exata e não vazia', () => {
  assert.equal(constantTimeSecretMatch('a'.repeat(32), 'a'.repeat(32)), true);
  assert.equal(constantTimeSecretMatch('a'.repeat(32), 'a'.repeat(31) + 'b'), false);
  assert.equal(constantTimeSecretMatch('a'.repeat(32), 'a'.repeat(31)), false);
  assert.equal(constantTimeSecretMatch('', ''), false);
  assert.equal(constantTimeSecretMatch('a'.repeat(513), 'a'.repeat(513)), false);
});

test('validação do corpo rejeita arrays, null e tipos primitivos', () => {
  assert.equal(isPlainObject({ update_id: 1 }), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject('payload'), false);
});

test('erros públicos não expõem detalhes internos', () => {
  assert.deepEqual(safePublicError(), {
    ok: false,
    error: 'Falha ao processar a solicitação.'
  });
});
