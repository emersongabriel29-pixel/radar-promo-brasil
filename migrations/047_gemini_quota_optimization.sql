CREATE TABLE IF NOT EXISTS radar_ai_copy_cache (
  cache_key TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS radar_ai_control (
  id TEXT PRIMARY KEY,
  paused_until TIMESTAMPTZ,
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO radar_ai_control(id,paused_until,reason)
VALUES('global',NULL,NULL)
ON CONFLICT(id) DO NOTHING;