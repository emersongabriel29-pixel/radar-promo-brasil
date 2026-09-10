ALTER TABLE promo_groups ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE promo_groups ADD CONSTRAINT chk_groups_platform CHECK(platform IN ('WHATSAPP','TELEGRAM')) NOT VALID;

CREATE TABLE IF NOT EXISTS telegram_connections (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  bot_username TEXT NOT NULL DEFAULT '',
  secret_slot INTEGER NOT NULL DEFAULT 1 CHECK(secret_slot BETWEEN 1 AND 3),
  priority INTEGER NOT NULL DEFAULT 100 CHECK(priority BETWEEN 1 AND 9999),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PAUSED','DEGRADED')),
  last_seen_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id,bot_id),
  UNIQUE(account_id,secret_slot)
);

ALTER TABLE publications ADD COLUMN IF NOT EXISTS telegram_connection_id TEXT REFERENCES telegram_connections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_telegram_connections_account ON telegram_connections(account_id,status,priority);
CREATE INDEX IF NOT EXISTS idx_groups_account_platform ON promo_groups(account_id,platform,status,name);
