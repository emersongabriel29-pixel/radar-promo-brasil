CREATE TABLE IF NOT EXISTS affiliate_sales (
 id text PRIMARY KEY,
 account_id text NOT NULL,
 external_id text NOT NULL,
 marketplace text NOT NULL,
 offer_id text,
 group_id text,
 subid text NOT NULL DEFAULT '',
 gross_cents integer NOT NULL DEFAULT 0,
 commission_cents integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'PENDING',
 ordered_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_sales_account_marketplace_external
 ON affiliate_sales(account_id,marketplace,external_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_account_group
 ON affiliate_sales(group_id,account_id,ordered_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_account_offer
 ON affiliate_sales(ordered_at,account_id,offer_id);
CREATE INDEX IF NOT EXISTS idx_sales_account_marketplace
 ON affiliate_sales(ordered_at,account_id,marketplace,status);
CREATE INDEX IF NOT EXISTS idx_sales_account_time
 ON affiliate_sales(ordered_at,account_id);
