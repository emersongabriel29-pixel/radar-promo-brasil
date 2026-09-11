-- Radar Intelligence correction: existing SaaS IDs are TEXT, not UUID.
-- 012 may have created these fresh tables before failing on incompatible types.
DROP TABLE IF EXISTS offer_price_history;
DROP TABLE IF EXISTS autopilot_rules;

CREATE TABLE IF NOT EXISTS offer_price_history (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  price BIGINT NOT NULL,
  original_price BIGINT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offer_price_history_offer_time ON offer_price_history(account_id, offer_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_price_history_account_time ON offer_price_history(account_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS autopilot_rules (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  min_score INTEGER NOT NULL DEFAULT 80 CHECK(min_score BETWEEN 0 AND 100),
  min_discount INTEGER NOT NULL DEFAULT 10 CHECK(min_discount BETWEEN 0 AND 100),
  max_price BIGINT,
  max_publications_per_day INTEGER NOT NULL DEFAULT 20 CHECK(max_publications_per_day BETWEEN 1 AND 500),
  cooldown_minutes INTEGER NOT NULL DEFAULT 60 CHECK(cooldown_minutes >= 0),
  require_price_history BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PAUSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_autopilot_rules_account_status ON autopilot_rules(account_id, status);

CREATE INDEX IF NOT EXISTS idx_offers_radar ON offers(account_id, radar_score DESC, status, created_at DESC);
