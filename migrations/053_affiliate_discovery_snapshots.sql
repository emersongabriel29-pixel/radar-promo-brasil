CREATE TABLE IF NOT EXISTS affiliate_discovery_snapshots (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  marketplace text NOT NULL,
  kind text NOT NULL,
  external_id text NOT NULL,
  sales_count bigint,
  price_cents bigint,
  commission_rate numeric,
  rating numeric,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_discovery_snapshots_product_time
  ON affiliate_discovery_snapshots(account_id, marketplace, kind, external_id, captured_at DESC);