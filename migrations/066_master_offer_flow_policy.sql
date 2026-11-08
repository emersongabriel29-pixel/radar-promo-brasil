-- Versioned rollout: new Master-flow publications use technical eligibility only.
-- Existing READY/RETRY records remain on the legacy policy until explicitly reconciled.
ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS eligibility_policy_version TEXT NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_publications_policy_dispatch
  ON publications (eligibility_policy_version, status, created_at);