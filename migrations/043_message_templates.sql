CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_message_templates_name CHECK (length(trim(name)) BETWEEN 1 AND 80),
  CONSTRAINT chk_message_templates_body CHECK (length(trim(body)) BETWEEN 1 AND 3000)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_message_templates_account_name
  ON message_templates(account_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_message_templates_account_active
  ON message_templates(account_id, is_active, updated_at DESC);
