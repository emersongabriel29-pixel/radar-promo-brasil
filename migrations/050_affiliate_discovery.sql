CREATE TABLE IF NOT EXISTS affiliate_discovery_runs (
 id text PRIMARY KEY, account_id text NOT NULL,
 marketplace text NOT NULL CHECK(marketplace IN ('LOMADEE','ALIEXPRESS','SHOPEE')),
 operation text NOT NULL, status text NOT NULL DEFAULT 'QUEUED',
 cursor_in text, cursor_out text, pages_completed integer NOT NULL DEFAULT 0,
 records_seen integer NOT NULL DEFAULT 0, records_upserted integer NOT NULL DEFAULT 0,
 rate_limit_remaining integer, started_at timestamptz, finished_at timestamptz,
 last_error text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS affiliate_discovery_runs_account_status ON affiliate_discovery_runs(account_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_discovery_runs_provider_time ON affiliate_discovery_runs(account_id,marketplace,created_at DESC);
CREATE TABLE IF NOT EXISTS affiliate_discovery_items (
 id text PRIMARY KEY, account_id text NOT NULL,
 marketplace text NOT NULL CHECK(marketplace IN ('LOMADEE','ALIEXPRESS','SHOPEE')),
 kind text NOT NULL CHECK(kind IN ('PRODUCT','BRAND','CAMPAIGN','SHOP','CATEGORY','CHANNEL','LINK')),
 external_id text NOT NULL, title text NOT NULL DEFAULT '', brand_name text NOT NULL DEFAULT '',
 campaign_id text NOT NULL DEFAULT '', product_url text NOT NULL DEFAULT '', affiliate_url text NOT NULL DEFAULT '',
 image_url text NOT NULL DEFAULT '', price_cents bigint, commission_rate numeric, rating numeric,
 sales_count bigint, available boolean, raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
 first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), last_run_id text
);
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_discovery_items_identity ON affiliate_discovery_items(account_id,marketplace,kind,external_id);
CREATE INDEX IF NOT EXISTS affiliate_discovery_items_account_kind ON affiliate_discovery_items(account_id,kind,marketplace,last_seen_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_discovery_items_campaign ON affiliate_discovery_items(account_id,marketplace,campaign_id) WHERE campaign_id<>'';
