CREATE TABLE IF NOT EXISTS shopee_category_api_validation (
  account_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  category_level INTEGER NOT NULL DEFAULT 1,
  validation_status TEXT NOT NULL DEFAULT 'NOT_TESTED',
  sample_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  last_checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, category_id)
);
CREATE INDEX IF NOT EXISTS shopee_category_validation_status_idx
  ON shopee_category_api_validation(account_id, validation_status, updated_at DESC);