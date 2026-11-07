ALTER TABLE affiliate_discovery_items
  ADD COLUMN IF NOT EXISTS category_slug TEXT,
  ADD COLUMN IF NOT EXISTS source_keyword TEXT;
CREATE INDEX IF NOT EXISTS affiliate_discovery_items_category_idx
  ON affiliate_discovery_items(account_id, marketplace, kind, category_slug);