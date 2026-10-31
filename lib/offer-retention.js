export const OFFER_RETENTION_INTERVAL_MS = 48 * 60 * 60 * 1000;
export const OFFER_RETENTION_ROUTE = '/api/jobs/offer-retention';
export const OFFER_RETENTION_TASK_NAME = 'offer-retention-every-48-hours';
export const DISCOVERY_RETENTION_BATCH_SIZE = 500;
export const OFFER_RETENTION_BATCH_SIZE = 100;

export function nextOfferRetentionAt(now = Date.now()) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(timestamp)) throw new TypeError('Invalid scheduler timestamp');
  return new Date(timestamp + OFFER_RETENTION_INTERVAL_MS).toISOString();
}

// Remove only abandoned discovery records. Safety-blocked records and anything
// already associated with an offer are retained for audit/history.
export const DELETE_STALE_DISCOVERY_SQL = `
  DELETE FROM affiliate_discovery_items
  WHERE id IN (
    SELECT d.id
    FROM affiliate_discovery_items d
    WHERE d.last_seen_at < now() - interval '48 hours'
      AND d.processing_status IN ('DISCOVERED', 'INCOMPLETE', 'FAILED', 'DUPLICATE')
      AND d.offer_id IS NULL
    ORDER BY d.last_seen_at ASC, d.id ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id
`;

// Delete only old, unconfirmed drafts that have no publication, price history,
// or discovery reference. The status allowlist deliberately excludes every
// approved/published/active state; confirmed validation is also protected.
export const DELETE_STALE_UNCONFIRMED_OFFERS_SQL = `
  DELETE FROM offers
  WHERE id IN (
    SELECT candidate.id
    FROM offers candidate
    WHERE candidate.created_at < now() - interval '48 hours'
      AND candidate.status IN ('PENDING', 'REJECTED')
      AND candidate.validation_status NOT IN ('VALID', 'VALIDATED', 'CONFIRMED')
      AND candidate.storefront_visible = false
      AND NOT EXISTS (
        SELECT 1 FROM publications p
        WHERE p.offer_id = candidate.id AND p.account_id = candidate.account_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM offer_price_history h
        WHERE h.offer_id = candidate.id AND h.account_id = candidate.account_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM affiliate_discovery_items d
        WHERE d.offer_id = candidate.id AND d.account_id = candidate.account_id
      )
    ORDER BY candidate.created_at ASC, candidate.id ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id
`;
