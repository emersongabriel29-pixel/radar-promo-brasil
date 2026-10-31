ALTER TABLE affiliate_discovery_items
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'DISCOVERED',
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_id text,
  ADD COLUMN IF NOT EXISTS processing_error text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS affiliate_discovery_items_shopee_pending
  ON affiliate_discovery_items(account_id, first_seen_at)
  WHERE marketplace='SHOPEE' AND kind='PRODUCT'
    AND processing_status IN ('DISCOVERED','FAILED');
