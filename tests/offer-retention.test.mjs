import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELETE_STALE_DISCOVERY_SQL,
  DELETE_STALE_UNCONFIRMED_OFFERS_SQL,
  DISCOVERY_RETENTION_BATCH_SIZE,
  OFFER_RETENTION_BATCH_SIZE,
  OFFER_RETENTION_INTERVAL_MS,
  OFFER_RETENTION_ROUTE,
  OFFER_RETENTION_TASK_NAME,
  nextOfferRetentionAt
} from '../lib/offer-retention.js';

test('retention interval is exactly 48 hours', () => {
  assert.equal(OFFER_RETENTION_INTERVAL_MS, 172800000);
  assert.equal(nextOfferRetentionAt(Date.parse('2026-10-31T12:00:00.000Z')), '2026-11-02T12:00:00.000Z');
});

test('worker uses a single stable one-shot task identity', () => {
  assert.equal(OFFER_RETENTION_ROUTE, '/api/jobs/offer-retention');
  assert.equal(OFFER_RETENTION_TASK_NAME, 'offer-retention-every-48-hours');
});

test('cleanup is bounded and processes abandoned discovery only', () => {
  assert.equal(DISCOVERY_RETENTION_BATCH_SIZE, 500);
  assert.match(DELETE_STALE_DISCOVERY_SQL, /last_seen_at < now\(\) - interval '48 hours'/);
  assert.match(DELETE_STALE_DISCOVERY_SQL, /processing_status IN \('DISCOVERED', 'INCOMPLETE', 'FAILED', 'DUPLICATE'\)/);
  assert.match(DELETE_STALE_DISCOVERY_SQL, /offer_id IS NULL/);
  assert.doesNotMatch(DELETE_STALE_DISCOVERY_SQL, /'BLOCKED'|'IMPORTED'|'LINKED'/);
  assert.match(DELETE_STALE_DISCOVERY_SQL, /LIMIT \$1[\s\S]*FOR UPDATE SKIP LOCKED/);
});

test('offer cleanup excludes approved, published, confirmed and referenced offers', () => {
  assert.equal(OFFER_RETENTION_BATCH_SIZE, 100);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /created_at < now\(\) - interval '48 hours'/);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /status IN \('PENDING', 'REJECTED'\)/);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /validation_status NOT IN \('VALID', 'VALIDATED', 'CONFIRMED'\)/);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /storefront_visible = false/);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /NOT EXISTS \([\s\S]*FROM publications/);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /NOT EXISTS \([\s\S]*FROM offer_price_history/);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /NOT EXISTS \([\s\S]*FROM affiliate_discovery_items/);
  assert.match(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, /LIMIT \$1[\s\S]*FOR UPDATE SKIP LOCKED/);
});
