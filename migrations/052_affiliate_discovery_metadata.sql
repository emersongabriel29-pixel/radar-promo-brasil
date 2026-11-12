ALTER TABLE affiliate_discovery_items ADD COLUMN IF NOT EXISTS category_slug text;
ALTER TABLE affiliate_discovery_items ADD COLUMN IF NOT EXISTS source_keyword text;
CREATE INDEX IF NOT EXISTS affiliate_discovery_items_category_idx ON affiliate_discovery_items(category_slug,kind,marketplace,account_id);
