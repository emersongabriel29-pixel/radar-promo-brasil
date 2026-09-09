ALTER TABLE categories ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE lead_events ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS account_settings (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  minimum_score INTEGER NOT NULL DEFAULT 70 CHECK(minimum_score BETWEEN 0 AND 100),
  maximum_batch INTEGER NOT NULL DEFAULT 20 CHECK(maximum_batch BETWEEN 1 AND 50),
  require_image BOOLEAN NOT NULL DEFAULT true,
  require_affiliate_link BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE owner_account TEXT;
BEGIN
  SELECT id INTO owner_account FROM accounts WHERE owner_member_id NOT LIKE 'preview:%' ORDER BY created_at LIMIT 1;
  IF owner_account IS NULL THEN SELECT id INTO owner_account FROM accounts ORDER BY created_at LIMIT 1; END IF;
  IF owner_account IS NOT NULL THEN
    UPDATE categories SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE promo_groups SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE offers SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE publications SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE monitors SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE queues SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE schedules SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE lead_events SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE activity_log SET account_id=owner_account WHERE account_id IS NULL;
    UPDATE webhook_events SET account_id=owner_account WHERE account_id IS NULL;
    INSERT INTO account_settings(account_id) VALUES(owner_account) ON CONFLICT DO NOTHING;
  END IF;
END $$;

ALTER TABLE categories ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE promo_groups ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE offers ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE publications ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE monitors ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE queues ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE schedules ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE lead_events ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE activity_log ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE webhook_events ALTER COLUMN account_id SET NOT NULL;

DROP INDEX IF EXISTS uq_offers_fingerprint;
CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_account_fingerprint ON offers(account_id,fingerprint) WHERE fingerprint IS NOT NULL;
DROP INDEX IF EXISTS uq_publications_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS uq_publications_account_idempotency ON publications(account_id,idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_account_id ON categories(account_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_groups_account_id ON promo_groups(account_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_account_id ON offers(account_id,id);

DO $$ BEGIN
  ALTER TABLE promo_groups ADD CONSTRAINT fk_groups_account_category FOREIGN KEY(account_id,category_id) REFERENCES categories(account_id,id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE publications ADD CONSTRAINT fk_publications_account_offer FOREIGN KEY(account_id,offer_id) REFERENCES offers(account_id,id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE publications ADD CONSTRAINT fk_publications_account_group FOREIGN KEY(account_id,group_id) REFERENCES promo_groups(account_id,id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE monitors ADD CONSTRAINT fk_monitors_account_category FOREIGN KEY(account_id,category_id) REFERENCES categories(account_id,id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE queues ADD CONSTRAINT fk_queues_account_category FOREIGN KEY(account_id,category_id) REFERENCES categories(account_id,id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE schedules ADD CONSTRAINT fk_schedules_account_group FOREIGN KEY(account_id,group_id) REFERENCES promo_groups(account_id,id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE lead_events ADD CONSTRAINT fk_leads_account_group FOREIGN KEY(account_id,group_id) REFERENCES promo_groups(account_id,id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_categories_account_name ON categories(account_id,name);
CREATE INDEX IF NOT EXISTS idx_groups_account_status ON promo_groups(account_id,status,name);
CREATE INDEX IF NOT EXISTS idx_offers_account_status_created ON offers(account_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publications_account_status_created ON publications(account_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitors_account_status ON monitors(account_id,status);
CREATE INDEX IF NOT EXISTS idx_queues_account_status ON queues(account_id,status);
CREATE INDEX IF NOT EXISTS idx_schedules_account_status ON schedules(account_id,status);
CREATE INDEX IF NOT EXISTS idx_leads_account_time ON lead_events(account_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_account_time ON activity_log(account_id,created_at DESC);

ALTER TABLE offers ADD CONSTRAINT chk_offers_current_price CHECK(current_price > 0) NOT VALID;
ALTER TABLE offers ADD CONSTRAINT chk_offers_original_price CHECK(original_price IS NULL OR original_price >= 0) NOT VALID;
ALTER TABLE offers ADD CONSTRAINT chk_offers_discount CHECK(discount_percent BETWEEN 0 AND 100) NOT VALID;
ALTER TABLE queues ADD CONSTRAINT chk_queues_interval CHECK(interval_minutes BETWEEN 1 AND 30) NOT VALID;
ALTER TABLE publications ADD CONSTRAINT chk_publications_priority CHECK(priority BETWEEN 0 AND 100) NOT VALID;
