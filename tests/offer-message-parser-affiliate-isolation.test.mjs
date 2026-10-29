import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfferMessage } from '../lib/offer-message-parser.js';

test('does not attach an affiliate link from a different marketplace', () => {
  const parsed = parseOfferMessage(
    'Fone Bluetooth\nR$ 99,90\nhttps://shopee.com.br/product/123?shop=1\nhttps://amzn.to/abc123'
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.marketplace, 'SHOPEE');
  assert.equal(parsed.affiliateLinkDetected, false);
  assert.equal(parsed.affiliateUrl, '');
  assert.equal(parsed.needsAffiliateLink, true);
  assert.equal(parsed.requiresManualReview, true);
});

test('does not attach a tracking URL for a different product from the same marketplace', () => {
  const parsed = parseOfferMessage(
    'Fone Bluetooth\nR$ 99,90\nhttps://shopee.com.br/product/123?shop=1\nhttps://shopee.com.br/product/999?shop=2&af=affiliate-code'
  );
  assert.equal(parsed.marketplace, 'SHOPEE');
  assert.equal(parsed.affiliateLinkDetected, false);
  assert.equal(parsed.affiliateUrl, '');
  assert.equal(parsed.needsAffiliateLink, true);
  assert.equal(parsed.requiresManualReview, true);
});

test('recognizes affiliate tracking only on the selected product URL itself', () => {
  const parsed = parseOfferMessage(
    'Fone Bluetooth\nR$ 99,90\nhttps://shopee.com.br/product/123?shop=1&af=affiliate-code'
  );
  assert.equal(parsed.marketplace, 'SHOPEE');
  assert.equal(parsed.affiliateLinkDetected, true);
  assert.match(parsed.affiliateUrl, /product\/123.*af=affiliate-code/);
  assert.equal(parsed.requiresManualReview, true);
});

test('keeps a normal product URL pending affiliate verification', () => {
  const parsed = parseOfferMessage(
    'Fone Bluetooth\nR$ 99,90\nhttps://www.amazon.com.br/dp/B000000000'
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.marketplace, 'AMAZON');
  assert.equal(parsed.affiliateLinkDetected, false);
  assert.equal(parsed.needsAffiliateLink, true);
  assert.equal(parsed.requiresManualReview, true);
});
