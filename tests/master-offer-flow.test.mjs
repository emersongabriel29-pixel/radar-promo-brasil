import test from 'node:test';
import assert from 'node:assert/strict';
import { canEnterOfferFlow } from '../lib/offer-flow-policy.js';
import { eligiblePublication } from '../lib/delivery.js';

const base = {
  title: 'Produto de exemplo',
  current_price: 12990,
  affiliate_url: 'https://affiliate.example/oferta',
  validation_status: 'VALIDATED'
};

test('categoria +18, score baixo, sem desconto, comissão ou avaliação não bloqueiam', () => {
  const result = canEnterOfferFlow({
    ...base,
    title: 'Produto adulto +18',
    category: 'Adultos',
    score: 0,
    radar_score: 0,
    discount_percent: 0,
    commission_rate: 0,
    rating: null,
    classification_status: 'REVIEW',
    image_url: null,
    image_storage_key: null,
    price_history_count: 0
  });
  assert.deepEqual(result, { eligible: true, reason: null });
});

test('imagem, histórico de preço e classificação são opcionais', () => {
  assert.equal(canEnterOfferFlow({
    ...base,
    classification_status: 'REVIEW',
    image_url: null,
    price_history_count: 0
  }).eligible, true);
});

test('preço ausente ou não positivo é dependência técnica, não filtro comercial', () => {
  for (const price of [null, 0, -100, 12.5, 'invalid']) {
    assert.equal(canEnterOfferFlow({ ...base, current_price: price }).reason, 'MISSING_VERIFIABLE_PRICE');
  }
});

test('link afiliado precisa ser HTTPS e não pode conter credenciais', () => {
  assert.equal(canEnterOfferFlow({ ...base, affiliate_url: 'http://affiliate.example/x' }).reason, 'MISSING_VALID_AFFILIATE_LINK');
  assert.equal(canEnterOfferFlow({ ...base, affiliate_url: 'https://user:pass@affiliate.example/x' }).reason, 'MISSING_VALID_AFFILIATE_LINK');
});

test('rejeição explícita de integridade/duplicidade aguarda reconciliação sem ser apagada', () => {
  assert.equal(canEnterOfferFlow({ ...base, validation_status: 'REJECTED' }).reason, 'DUPLICATE_OR_DATA_INTEGRITY_RECONCILIATION_REQUIRED');
});

test('duplicatas consolidadas preservam o vínculo canônico e não voltam à fila', () => {
  assert.equal(canEnterOfferFlow({ ...base, status: 'DUPLICATE_MERGED' }).reason, 'MERGED_INTO_CANONICAL_OFFER');
});

test('restrição oficial de um provedor é isolada e não vira filtro global por +18', () => {
  assert.equal(canEnterOfferFlow({ ...base, title: 'Produto adulto +18', source: 'SHOPEE' }).eligible, true);
  assert.equal(canEnterOfferFlow({ ...base, status: 'PROVIDER_RESTRICTED' }).reason, 'EXTERNAL_PROVIDER_POLICY_RESTRICTION');
});

test('publicações novas usam política Master versionada sem gates de classificação ou histórico', () => {
  assert.match(eligiblePublication, /eligibility_policy_version='master_v1'/);
  assert.match(eligiblePublication, /verified_offer\.current_price>0/);
  assert.match(eligiblePublication, /verified_offer\.affiliate_url/);
  assert.match(eligiblePublication, /eligibility_policy_version='master_v1' OR p\.offer_id IS NULL/);
});
