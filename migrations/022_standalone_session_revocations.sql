CREATE TABLE IF NOT EXISTS standalone_session_revocations (
  nonce TEXT PRIMARY KEY,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS standalone_session_revocations_expiry_idx
  ON standalone_session_revocations(expires_at);
