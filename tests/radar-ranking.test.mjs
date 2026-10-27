import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRadarScore, classifyRadarScore, rankRadarOffers } from '../lib/radar.js';

test('unverified advertised original price does not increase score', () => {
  const withoutClaim = calculateRadarScore({ currentPrice: 100, originalPrice: 200, originalPriceVerified: false });
  const withVerifiedClaim = calculateRadarScore({ currentPrice: 100, originalPrice: 200, originalPriceVerified: true });
  assert.ok(withVerifiedClaim.score > withoutClaim.score);
  assert.ok(withoutClaim.reasons.some((reason) => reason.includes('não verificado')));
});

test('historical price evidence and commerce signals are reflected in score reasons', () => {
  const result = calculateRadarScore({
    currentPrice: 80,
    averagePrice: 100,
    historyCount: 7,
    commissionRate: 8,
    salesCount: 1500,
    rating: 4.8,
    reviewCount: 300,
    title: 'Produto de teste',
    productUrl: 'https://example.com/item',
    imageUrl: 'https://example.com/image.jpg',
  });
  assert.ok(result.score > 35);
  assert.ok(result.reasons.some((reason) => reason.includes('comissão')));
  assert.ok(result.reasons.some((reason) => reason.includes('vendas')));
  assert.ok(result.reasons.some((reason) => reason.includes('histórica')));
});

test('rankRadarOffers compares the whole batch before applying the limit', () => {
  const offers = [
    { id: 'first', currentPrice: 100 },
    { id: 'best', currentPrice: 50, lowestPrice: 50, historyCount: 7, coupon: true },
    { id: 'middle', currentPrice: 90, averagePrice: 100 },
    { id: 'fourth', currentPrice: 200 },
  ];
  const ranked = rankRadarOffers(offers, { limit: 2 });
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].id, 'best');
  assert.ok(ranked[0].radarScore >= ranked[1].radarScore);
  assert.ok(Array.isArray(ranked[0].radarScoreReasons));
});

test('ranking is stable for equal scores and supports a minimum score', () => {
  const offers = [{ id: 'a', currentPrice: 100 }, { id: 'b', currentPrice: 100 }];
  assert.deepEqual(rankRadarOffers(offers).map((offer) => offer.id), ['a', 'b']);
  assert.deepEqual(rankRadarOffers(offers, { minimumScore: 101 }), []);
});

test('classification preserves the existing thresholds', () => {
  assert.equal(classifyRadarScore(90).label, 'EXCEPCIONAL');
  assert.equal(classifyRadarScore(80).label, 'ÓTIMA');
  assert.equal(classifyRadarScore(70).label, 'BOA');
});
