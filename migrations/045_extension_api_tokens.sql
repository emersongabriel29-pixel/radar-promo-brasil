-- Standalone Bearer credentials for the Chrome extension.
-- The raw token is never stored; only its SHA-256 digest is persisted.
CREATE TABLE IF NOT EXISTS extension_api_tokens (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_last4 TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_extension_api_tokens_hash
  ON extension_api_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_extension_api_tokens_account_active
  ON extension_api_tokens(account_id, created_at DESC)
  WHERE revoked_at IS NULL;
