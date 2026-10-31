CREATE INDEX IF NOT EXISTS affiliate_discovery_items_lomadee_pending
  ON affiliate_discovery_items(account_id, first_seen_at, id)
  WHERE marketplace='LOMADEE' AND kind='PRODUCT'
    AND processing_status IN ('DISCOVERED','FAILED');

CREATE INDEX IF NOT EXISTS affiliate_discovery_items_lomadee_status
  ON affiliate_discovery_items(account_id, processing_status, last_seen_at DESC)
  WHERE marketplace='LOMADEE' AND kind='PRODUCT';