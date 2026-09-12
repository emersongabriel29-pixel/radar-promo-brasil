CREATE TABLE IF NOT EXISTS social_autopilot_settings (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PAUSED' CHECK (status IN ('ACTIVE','PAUSED')),
  auto_generate BOOLEAN NOT NULL DEFAULT true,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  channels JSONB NOT NULL DEFAULT '["INSTAGRAM","FACEBOOK"]'::jsonb,
  min_score INTEGER NOT NULL DEFAULT 70 CHECK (min_score BETWEEN 0 AND 100),
  max_posts_per_day INTEGER NOT NULL DEFAULT 6 CHECK (max_posts_per_day BETWEEN 1 AND 50),
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes BETWEEN 15 AND 1440),
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '22:00',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  last_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('INSTAGRAM','FACEBOOK')),
  message TEXT NOT NULL,
  image_url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','READY','SCHEDULED','PUBLISHING','PUBLISHED','RETRY','BLOCKED','FAILED')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  provider TEXT NOT NULL DEFAULT 'META',
  external_id TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id,idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_due ON social_posts(status,scheduled_at,next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_account_time ON social_posts(account_id,created_at DESC);

