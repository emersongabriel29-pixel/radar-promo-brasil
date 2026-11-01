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
  assert.ok(DELETE_STALE_DISCOVERY_SQL.includes("last_seen_at < now() - interval '48 hours'"));
  assert.ok(DELETE_STALE_DISCOVERY_SQL.includes("processing_status IN ('DISCOVERED', 'INCOMPLETE', 'FAILED', 'DUPLICATE')"));
  assert.ok(DELETE_STALE_DISCOVERY_SQL.includes('offer_id IS NULL'));
  assert.ok(!DELETE_STALE_DISCOVERY_SQL.includes("'BLOCKED'"));
  assert.ok(DELETE_STALE_DISCOVERY_SQL.includes('LIMIT $1'));
  assert.ok(DELETE_STALE_DISCOVERY_SQL.includes('FOR UPDATE SKIP LOCKED'));
});

test('offer cleanup excludes confirmed and every schema-known offer reference', () => {
  assert.equal(OFFER_RETENTION_BATCH_SIZE, 100);
  assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes("created_at < now() - interval '48 hours'"));
  assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes("status IN ('PENDING', 'REJECTED')"));
  assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes("validation_status NOT IN ('VALID', 'VALIDATED', 'CONFIRMED')"));
  assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes('storefront_visible = false'));
  assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes('COALESCE(candidate.price_history_count, 0) = 0'));
  for (const table of ['publications', 'offer_price_history', 'affiliate_discovery_items', 'affiliate_sales', 'click_events', 'content_assets', 'social_posts', 'video_studio_projects']) {
    assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes('FROM ' + table), 'missing reference guard: ' + table);
  }
  assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes('LIMIT $1'));
  assert.ok(DELETE_STALE_UNCONFIRMED_OFFERS_SQL.includes('FOR UPDATE SKIP LOCKED'));
});
