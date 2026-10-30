CREATE TABLE IF NOT EXISTS offer_builder_settings (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  message_template_id TEXT,
  message_type TEXT NOT NULL DEFAULT 'PROMOTION',
  link_mode TEXT NOT NULL DEFAULT 'MANUAL',
  link_type TEXT NOT NULL DEFAULT 'AFFILIATE_REDIRECT',
  ai_assist BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);