CREATE TABLE IF NOT EXISTS account_api_credentials (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  docs_url TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  nonce TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_account_api_credentials_account ON account_api_credentials(account_id, created_at DESC);