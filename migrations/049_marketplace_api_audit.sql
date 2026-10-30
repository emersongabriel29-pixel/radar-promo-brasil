CREATE TABLE IF NOT EXISTS marketplace_api_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  marketplace text NOT NULL,
  operation text NOT NULL,
  status text NOT NULL,
  returned_count integer NOT NULL DEFAULT 0,
  total_available integer,
  page_count integer NOT NULL DEFAULT 0,
  rate_limit_remaining integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_api_audit_account_marketplace_checked
  ON marketplace_api_audit(account_id, marketplace, checked_at DESC);