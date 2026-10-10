CREATE TABLE IF NOT EXISTS meli_notification_events (
  id BIGSERIAL PRIMARY KEY,
  notification_key TEXT NOT NULL UNIQUE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  external_user_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  resource TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ,
  provider_received_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meli_notification_events_pending
  ON meli_notification_events(status, received_at)
  WHERE status IN ('RECEIVED', 'FAILED');

CREATE INDEX IF NOT EXISTS idx_meli_notification_events_account_topic
  ON meli_notification_events(account_id, topic, received_at DESC);