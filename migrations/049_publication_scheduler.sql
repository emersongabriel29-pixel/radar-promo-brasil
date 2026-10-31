CREATE TABLE IF NOT EXISTS publication_scheduler_settings (
  account_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  interval_minutes integer NOT NULL DEFAULT 10 CHECK (interval_minutes BETWEEN 1 AND 1440),
  batch_size integer NOT NULL DEFAULT 20 CHECK (batch_size BETWEEN 1 AND 100),
  source_order jsonb NOT NULL DEFAULT '["SHOPEE","ALIEXPRESS","LOMADEE"]'::jsonb,
  source_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_turn_at timestamptz NOT NULL DEFAULT now(),
  last_source text,
  last_run_at timestamptz,
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_publication_scheduler_due
  ON publication_scheduler_settings (next_turn_at)
  WHERE enabled = true;