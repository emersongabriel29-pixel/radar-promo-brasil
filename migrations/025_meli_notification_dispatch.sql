CREATE TABLE IF NOT EXISTS meli_notification_dispatch_state (
  id TEXT PRIMARY KEY,
  last_scheduled_at TIMESTAMPTZ NOT NULL DEFAULT 'epoch'::timestamptz
);