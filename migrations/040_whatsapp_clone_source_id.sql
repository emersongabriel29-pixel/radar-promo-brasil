-- Add a stable WhatsApp group identifier without replacing the original invite URL.
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS external_source_id TEXT;
CREATE INDEX IF NOT EXISTS idx_monitors_whatsapp_clone_source
  ON monitors(account_id, external_source_id)
  WHERE source_type='WHATSAPP_GROUP' AND external_source_id IS NOT NULL;