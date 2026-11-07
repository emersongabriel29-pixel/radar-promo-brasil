import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetryableShopeeErrorCode, shopeeRetryDelay } from '../lib/shopee-api-errors.js';

test('retries Shopee System Error 10000 and Rate Limit 10030 at most twice', () => {
  assert.equal(isRetryableShopeeErrorCode('10000', 0), true);
  assert.equal(isRetryableShopeeErrorCode('10000', 1), true);
  assert.equal(isRetryableShopeeErrorCode('10000', 2), false);
  assert.equal(isRetryableShopeeErrorCode('10030', 0), true);
  assert.equal(isRetryableShopeeErrorCode('10030', 2), false);
});

test('does not retry non-transient Shopee errors', () => {
  assert.equal(isRetryableShopeeErrorCode('10010', 0), false);
  assert.equal(isRetryableShopeeErrorCode('10020', 0), false);
  assert.equal(isRetryableShopeeErrorCode('', 0), false);
});

test('uses bounded exponential retry delays', () => {
  assert.equal(shopeeRetryDelay(0), 1200);
  assert.equal(shopeeRetryDelay(1), 2800);
  assert.equal(shopeeRetryDelay(2), 2800);
});
