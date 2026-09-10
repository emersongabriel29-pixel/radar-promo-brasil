CREATE TABLE IF NOT EXISTS click_events (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES promo_groups(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  offer_id TEXT REFERENCES offers(id) ON DELETE SET NULL,
  group_id TEXT REFERENCES promo_groups(id) ON DELETE SET NULL,
  subid TEXT NOT NULL DEFAULT '',
  gross_cents INTEGER NOT NULL DEFAULT 0 CHECK(gross_cents >= 0),
  commission_cents INTEGER NOT NULL DEFAULT 0 CHECK(commission_cents >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','CANCELLED','PAID')),
  ordered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id,marketplace,external_id)
);
CREATE INDEX IF NOT EXISTS idx_clicks_account_time ON click_events(account_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_account_marketplace ON click_events(account_id,marketplace,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_account_group ON click_events(account_id,group_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_account_time ON affiliate_sales(account_id,ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_account_marketplace ON affiliate_sales(account_id,marketplace,status,ordered_at DESC);
