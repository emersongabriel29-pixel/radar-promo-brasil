ALTER TABLE marketplace_api_credentials
  DROP CONSTRAINT IF EXISTS marketplace_api_credentials_status_check;

ALTER TABLE marketplace_api_credentials
  ADD CONSTRAINT marketplace_api_credentials_status_check
  CHECK (status IN ('PENDING_VALIDATION','READ_ONLY_VALIDATED','LINKS_READ_VALIDATED','VALIDATED','ERROR'));