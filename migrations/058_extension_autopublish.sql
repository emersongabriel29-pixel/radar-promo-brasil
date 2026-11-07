CREATE TABLE IF NOT EXISTS extension_autopublish_settings (
  account_id text PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_extension_autopublish_enabled
  ON extension_autopublish_settings(enabled, updated_at);