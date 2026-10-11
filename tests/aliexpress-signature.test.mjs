import test from 'node:test';
import assert from 'node:assert/strict';
import { hmacMd5, signTopParams } from '../lib/top-signature.js';

test('HMAC-MD5 matches the documented 128-bit signature format', () => {
  assert.equal(hmacMd5('The quick brown fox jumps over the lazy dog', 'key'), '80070713463E7749B90C2DC24911E275');
});

test('TOP request signature is deterministic and independent of object key order', () => {
  const a = { app_key: '123', method: 'aliexpress.affiliate.category.get', format: 'json', v: '2.0' };
  const b = { v: '2.0', format: 'json', method: 'aliexpress.affiliate.category.get', app_key: '123' };
  assert.equal(signTopParams(a, 'secret'), signTopParams(b, 'secret'));
  assert.match(signTopParams(a, 'secret'), /^[A-F0-9]{32}$/);
});
