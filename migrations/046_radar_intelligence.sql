CREATE TABLE IF NOT EXISTS radar_ai_insights (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  reference_id TEXT,
  model TEXT NOT NULL DEFAULT '',
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_radar_ai_insights_account_kind_created
  ON radar_ai_insights(account_id, kind, created_at DESC);