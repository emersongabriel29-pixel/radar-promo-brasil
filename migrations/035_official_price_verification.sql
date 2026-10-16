ALTER TABLE offer_price_history ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE offer_price_history ADD COLUMN IF NOT EXISTS source_reference text;
ALTER TABLE offer_price_history ADD COLUMN IF NOT EXISTS verified_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_offer_price_history_verified_recent ON offer_price_history(account_id, offer_id, verified_at DESC) WHERE source_type='OFFICIAL_API' AND verified_at IS NOT NULL;
