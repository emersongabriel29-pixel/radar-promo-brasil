ALTER TABLE affiliate_competition_observations
  ADD COLUMN IF NOT EXISTS search_term text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS results_scanned integer NOT NULL DEFAULT 0;
UPDATE affiliate_competition_observations SET results_scanned=videos_found WHERE results_scanned<videos_found;
ALTER TABLE affiliate_competition_observations
  DROP CONSTRAINT IF EXISTS affiliate_competition_observations_sample_check;
ALTER TABLE affiliate_competition_observations
  ADD CONSTRAINT affiliate_competition_observations_sample_check
  CHECK (results_scanned >= videos_found AND results_scanned <= 1000000);