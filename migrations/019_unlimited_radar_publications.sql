-- Remove artificial daily publication cap and cooldown from Radar autopilot rules.
ALTER TABLE autopilot_rules DROP CONSTRAINT IF EXISTS autopilot_rules_max_publications_per_day_check;
ALTER TABLE autopilot_rules ADD CONSTRAINT autopilot_rules_max_publications_per_day_check CHECK (max_publications_per_day >= 1);
ALTER TABLE autopilot_rules ALTER COLUMN max_publications_per_day SET DEFAULT 2147483647;
ALTER TABLE autopilot_rules ALTER COLUMN cooldown_minutes SET DEFAULT 0;
UPDATE autopilot_rules SET max_publications_per_day = 2147483647, cooldown_minutes = 0;
