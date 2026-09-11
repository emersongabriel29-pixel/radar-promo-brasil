ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_kind_check;

ALTER TABLE content_assets ADD CONSTRAINT content_assets_kind_check CHECK (kind IN ('PROMO_TEXT','COUPON_TEXT','INSTAGRAM_CAPTION','FACEBOOK_POST','AD_COPY','VIDEO_SCRIPT','CAROUSEL','IMAGE','VIDEO'));

CREATE TABLE IF NOT EXISTS media_generation_jobs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('IMAGE','VIDEO')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT '',
  ratio TEXT NOT NULL DEFAULT '1:1',
  duration_seconds INTEGER NOT NULL DEFAULT 5 CHECK (duration_seconds IN (5,10)),
  provider TEXT NOT NULL DEFAULT '',
  external_task_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FALLBACK_COMPLETED','FAILED')),
  storage_key TEXT NOT NULL DEFAULT '',
  output_url TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 40),
  render_token TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_jobs_account_time ON media_generation_jobs(account_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_jobs_status ON media_generation_jobs(status,updated_at);
