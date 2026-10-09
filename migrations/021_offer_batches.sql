ALTER TABLE publications ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS batch_category_id TEXT;
CREATE INDEX IF NOT EXISTS idx_publications_batch ON publications(account_id,batch_id,status);