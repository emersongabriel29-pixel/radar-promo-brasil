-- Central ledger for direct Google Gemini API usage.
-- Stores metadata and token counts only; never stores prompts, responses or credentials.
CREATE TABLE IF NOT EXISTS radar_gemini_usage (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  purpose TEXT NOT NULL DEFAULT 'unspecified',
  model TEXT NOT NULL,
  actor_id TEXT,
  status TEXT NOT NULL,
  http_status INTEGER,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  cached_tokens BIGINT NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_radar_gemini_usage_created
  ON radar_gemini_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_gemini_usage_purpose_created
  ON radar_gemini_usage(purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_gemini_usage_model_created
  ON radar_gemini_usage(model, created_at DESC);

-- A single global reservation queue keeps concurrent app modules below a conservative
-- 15 requests/minute pace. This is a pacing guard, not an offer/publication limit.
CREATE TABLE IF NOT EXISTS radar_gemini_throttle (
  id TEXT PRIMARY KEY,
  next_slot_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO radar_gemini_throttle(id,next_slot_at)
VALUES('global',now())
ON CONFLICT(id) DO NOTHING;