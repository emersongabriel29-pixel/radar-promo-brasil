import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { webhooks } from '../hatchable/index.js';

function sign(raw, secret) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

test('HMAC local aceita assinatura válida dentro da janela temporal', () => {
  const secret = 'test-secret';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const raw = `${timestamp}.{"event":"ok"}`;
  const signature = sign(raw, secret);
  assert.equal(webhooks.verifyHmac({ raw, signature, secret, timestamp, tolerance: 300 }), true);
});

test('HMAC local rejeita assinatura inválida', () => {
  const secret = 'test-secret';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const raw = `${timestamp}.{"event":"ok"}`;
  assert.equal(webhooks.verifyHmac({ raw, signature: '0'.repeat(64), secret, timestamp, tolerance: 300 }), false);
});

test('HMAC local rejeita timestamp expirado para impedir replay', () => {
  const secret = 'test-secret';
  const timestamp = String(Math.floor(Date.now() / 1000) - 301);
  const raw = `${timestamp}.{"event":"old"}`;
  const signature = sign(raw, secret);
  assert.equal(webhooks.verifyHmac({ raw, signature, secret, timestamp, tolerance: 300 }), false);
});
