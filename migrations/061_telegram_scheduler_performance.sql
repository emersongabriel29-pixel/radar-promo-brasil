-- Bounded Telegram scheduler query indexes. These partial indexes only cover
-- published/in-flight rows and preserve all existing publication records.
CREATE INDEX IF NOT EXISTS idx_publications_group_published_cooldown
  ON publications(account_id, group_id, published_at DESC)
  WHERE status = 'PUBLISHED' AND published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_publications_group_dispatching
  ON publications(account_id, group_id)
  WHERE status = 'DISPATCHING';

-- Supports the latest discovery metadata lookup used to rank Shopee offers.
CREATE INDEX IF NOT EXISTS idx_affiliate_discovery_offer_latest
  ON affiliate_discovery_items(account_id, offer_id, last_seen_at DESC)
  WHERE kind = 'PRODUCT';
