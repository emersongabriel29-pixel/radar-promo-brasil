ALTER TABLE offers ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS last_error TEXT NOT NULL DEFAULT '';
ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  discount_text TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id,marketplace,code)
);

CREATE TABLE IF NOT EXISTS content_assets (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  offer_id TEXT REFERENCES offers(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('PROMO_TEXT','COUPON_TEXT','INSTAGRAM_CAPTION','FACEBOOK_POST','AD_COPY','VIDEO_SCRIPT','CAROUSEL','IMAGE')),
  channel TEXT NOT NULL DEFAULT 'GENERAL',
  provider_model TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  asset_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','PUBLISHED','FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS growth_campaigns (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('META_ADS','GOOGLE_ADS','TIKTOK_ADS','INSTAGRAM','FACEBOOK','EMAIL','ORGANIC')),
  objective TEXT NOT NULL DEFAULT 'CLICKS',
  daily_budget_cents INTEGER NOT NULL DEFAULT 0 CHECK (daily_budget_cents >= 0),
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','PAUSED','FINISHED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_security_settings (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  retention_days INTEGER NOT NULL DEFAULT 365 CHECK (retention_days BETWEEN 30 AND 1825),
  marketing_consent_required BOOLEAN NOT NULL DEFAULT true,
  data_export_enabled BOOLEAN NOT NULL DEFAULT true,
  incident_email TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('ACCESS','CORRECTION','DELETION','PORTABILITY','REVOCATION')),
  requester_email TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','DONE','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS security_events (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_account_status ON coupons(account_id,status,ends_at);
CREATE INDEX IF NOT EXISTS idx_assets_account_time ON content_assets(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_account_status ON growth_campaigns(account_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_account_status ON privacy_requests(account_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_account_time ON security_events(account_id,created_at DESC);

INSERT INTO account_security_settings(account_id)
SELECT id FROM accounts ON CONFLICT DO NOTHING;

INSERT INTO marketplace_rules(id,account_id,marketplace)
SELECT md5(a.id || ':' || m.marketplace),a.id,m.marketplace
FROM accounts a
CROSS JOIN (VALUES
  ('SHEIN'),('ALIEXPRESS'),('MAGALU'),('CASAS_BAHIA'),('HOTMART'),
  ('KABUM'),('AMERICANAS'),('NATURA'),('AVON')
) AS m(marketplace)
ON CONFLICT(account_id,marketplace) DO NOTHING;
