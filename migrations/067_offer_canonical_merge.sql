-- Preserve the canonical relationship when duplicate offers are consolidated.
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS canonical_offer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_offers_canonical_offer
  ON offers (account_id, canonical_offer_id)
  WHERE canonical_offer_id IS NOT NULL;