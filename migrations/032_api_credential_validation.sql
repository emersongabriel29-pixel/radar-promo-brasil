ALTER TABLE account_api_credentials ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'NOT_TESTED';
ALTER TABLE account_api_credentials ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE account_api_credentials ADD COLUMN IF NOT EXISTS last_error TEXT NOT NULL DEFAULT '';