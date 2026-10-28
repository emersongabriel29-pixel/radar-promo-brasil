ALTER TABLE offers ADD COLUMN IF NOT EXISTS sub_id TEXT;
CREATE INDEX IF NOT EXISTS idx_offers_account_sub_id ON offers(account_id, sub_id) WHERE sub_id IS NOT NULL;
