-- Radar Intelligence: price history, explainable scoring and autopilot rules
CREATE TABLE IF NOT EXISTS offer_price_history (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  offer_id UUID NOT NULL,
  price BIGINT NOT NULL,
  original_price BIGINT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offer_price_history_offer_time ON offer_price_history(account_id, offer_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_price_history_account_time ON offer_price_history(account_id, captured_at DESC);

ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_first_seen BIGINT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_lowest BIGINT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_highest BIGINT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_average BIGINT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_history_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS radar_score INTEGER NOT NULL DEFAULT 35;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS radar_reasons TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS radar_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS autopilot_rules (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID,
  min_score INTEGER NOT NULL DEFAULT 80,
  min_discount INTEGER NOT NULL DEFAULT 10,
  max_price BIGINT,
  max_publications_per_day INTEGER NOT NULL DEFAULT 20,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  require_price_history BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PAUSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_autopilot_rules_account_status ON autopilot_rules(account_id, status);

CREATE INDEX IF NOT EXISTS idx_offers_radar ON offers(account_id, radar_score DESC, status, created_at DESC);
