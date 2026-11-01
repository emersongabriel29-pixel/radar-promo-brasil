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

// Delete only abandoned, unconfirmed drafts. Every table in the live schema
// that can retain an offer reference is checked before an offer can be removed.
export const DELETE_STALE_UNCONFIRMED_OFFERS_SQL = `
  DELETE FROM offers
  WHERE id IN (
    SELECT candidate.id
    FROM offers candidate
    WHERE candidate.created_at < now() - interval '48 hours'
      AND candidate.status IN ('PENDING', 'REJECTED')
      AND candidate.validation_status NOT IN ('VALID', 'VALIDATED', 'CONFIRMED')
      AND candidate.storefront_visible = false
      AND COALESCE(candidate.price_history_count, 0) = 0
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
      AND NOT EXISTS (
        SELECT 1 FROM affiliate_sales s
        WHERE s.offer_id = candidate.id AND s.account_id = candidate.account_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM click_events c
        WHERE c.offer_id = candidate.id AND c.account_id = candidate.account_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_assets a
        WHERE a.offer_id = candidate.id AND a.account_id = candidate.account_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.offer_id = candidate.id AND sp.account_id = candidate.account_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM video_studio_projects v
        WHERE v.offer_id = candidate.id AND v.account_id = candidate.account_id
      )
    ORDER BY candidate.created_at ASC, candidate.id ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id
`;
