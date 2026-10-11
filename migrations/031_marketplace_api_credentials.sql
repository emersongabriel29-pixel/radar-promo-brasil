CREATE TABLE IF NOT EXISTS marketplace_api_credentials (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  credentials_enc TEXT NOT NULL,
  nonce TEXT NOT NULL,
  credential_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_last4 TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING_VALIDATION',
  last_checked_at TIMESTAMPTZ,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, marketplace),
  CHECK (status IN ('PENDING_VALIDATION','VALIDATED','ERROR'))
);
CREATE INDEX IF NOT EXISTS idx_marketplace_api_credentials_account
  ON marketplace_api_credentials(account_id, marketplace, status);