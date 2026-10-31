CREATE TABLE IF NOT EXISTS affiliate_competition_observations (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  marketplace text NOT NULL DEFAULT 'SHOPEE' CHECK (marketplace = 'SHOPEE'),
  external_id text NOT NULL,
  product_title text NOT NULL,
  creators_found integer NOT NULL CHECK (creators_found >= 0 AND creators_found <= 1000000),
  videos_found integer NOT NULL CHECK (videos_found >= 0 AND videos_found <= 1000000),
  observation_method text NOT NULL DEFAULT 'MANUAL' CHECK (observation_method IN ('MANUAL')),
  note text NOT NULL DEFAULT '',
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_competition_latest
  ON affiliate_competition_observations(account_id, marketplace, external_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_competition_recent
  ON affiliate_competition_observations(account_id, observed_at DESC);