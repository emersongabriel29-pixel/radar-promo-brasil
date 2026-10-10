ALTER TABLE meli_notification_events
  ADD COLUMN IF NOT EXISTS processing_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE meli_notification_events
  ADD COLUMN IF NOT EXISTS resource_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_meli_notifications_work_queue
  ON meli_notification_events(status, received_at)
  WHERE status IN ('RECEIVED', 'FAILED');