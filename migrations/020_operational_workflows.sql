ALTER TABLE schedules ADD COLUMN IF NOT EXISTS weekday INTEGER NOT NULL DEFAULT 1;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS once_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS scheduler_task_id TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS last_error TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_tenant_id ON schedules(account_id,id);
ALTER TABLE publications ALTER COLUMN offer_id DROP NOT NULL;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS schedule_id TEXT;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'PROMOTION';
ALTER TABLE publications ADD CONSTRAINT fk_publication_tenant_schedule FOREIGN KEY(account_id,schedule_id) REFERENCES schedules(account_id,id);
ALTER TABLE publications ADD CONSTRAINT chk_publication_content CHECK ((content_type='PROMOTION' AND offer_id IS NOT NULL) OR (content_type='MESSAGE' AND schedule_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_schedules_due ON schedules(status,next_run_at);
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS source_authorized BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS affiliate_url TEXT NOT NULL DEFAULT '';
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS last_error TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_monitors_tenant_id ON monitors(account_id,id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS source_monitor_id TEXT;
ALTER TABLE offers ADD CONSTRAINT fk_offer_tenant_monitor FOREIGN KEY(account_id,source_monitor_id) REFERENCES monitors(account_id,id);
ALTER TABLE account_security_settings ADD COLUMN IF NOT EXISTS retention_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE privacy_requests ADD COLUMN IF NOT EXISTS subject_scope TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE privacy_requests ADD COLUMN IF NOT EXISTS subject_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE privacy_requests ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;
ALTER TABLE privacy_requests ADD COLUMN IF NOT EXISTS resolution_notes TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS operational_backups (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  row_counts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backups_account_time ON operational_backups(account_id,created_at DESC);
