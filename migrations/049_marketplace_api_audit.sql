{
    "path": "migrations/049_marketplace_api_audit.sql",
    "text": "CREATE TABLE IF NOT EXISTS marketplace_api_audit (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  account_id text NOT NULL,\n  marketplace text NOT NULL,\n  operation text NOT NULL,\n  status text NOT NULL,\n  returned_count integer NOT NULL DEFAULT 0,\n  total_available integer,\n  page_count integer NOT NULL DEFAULT 0,\n  rate_limit_remaining integer,\n  details jsonb NOT NULL DEFAULT '{}'::jsonb,\n  checked_at timestamptz NOT NULL DEFAULT now()\n);\nCREATE INDEX IF NOT EXISTS marketplace_api_audit_account_marketplace_checked\n  ON marketplace_api_audit(account_id, marketplace, checked_at DESC);",
    "hash": "51633d8a846a7f3a20735366aa2b5f8ae37101c10c829b04b33dc9b1774a0f4e",
    "total_lines": 15
}