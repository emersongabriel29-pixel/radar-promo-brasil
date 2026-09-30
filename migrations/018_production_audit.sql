-- Additive release fixes: preserve existing data, prices, rules and credentials.
ALTER TABLE autopilot_rules ALTER COLUMN min_score SET DEFAULT 85;
ALTER TABLE autopilot_rules ALTER COLUMN min_discount SET DEFAULT 15;
ALTER TABLE autopilot_rules ALTER COLUMN max_publications_per_day SET DEFAULT 5;
ALTER TABLE autopilot_rules ALTER COLUMN cooldown_minutes SET DEFAULT 120;
ALTER TABLE account_settings ADD COLUMN IF NOT EXISTS starter_initialized BOOLEAN NOT NULL DEFAULT false;
UPDATE account_settings s SET starter_initialized=true WHERE EXISTS(SELECT 1 FROM categories c WHERE c.account_id=s.account_id);
ALTER TABLE publications ADD COLUMN IF NOT EXISTS external_message_id TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS image_storage_key TEXT;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS image_storage_key TEXT;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS response JSONB;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE lead_events ADD COLUMN IF NOT EXISTS source_event_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS lead_events_source_key ON lead_events(account_id,source_event_key) WHERE source_event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS account_integration_health (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  details TEXT NOT NULL DEFAULT '',
  last_checked_at TIMESTAMPTZ,
  PRIMARY KEY(account_id,name)
);
CREATE TABLE IF NOT EXISTS connector_credential_bindings (
  provider TEXT NOT NULL,
  credential_slot TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY(provider,credential_slot)
);
INSERT INTO connector_credential_bindings(provider,credential_slot,account_id)
SELECT 'TELEGRAM',secret_slot::text,min(account_id)
FROM telegram_connections GROUP BY secret_slot HAVING count(DISTINCT account_id)=1
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_jobs_account_id ON media_generation_jobs(account_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_publications_account_id ON publications(account_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_connections_account_id ON whatsapp_connections(account_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_connections_account_id ON telegram_connections(account_id,id);
ALTER TABLE content_assets ADD CONSTRAINT fk_assets_tenant_offer FOREIGN KEY(account_id,offer_id) REFERENCES offers(account_id,id) ON DELETE CASCADE NOT VALID;
ALTER TABLE offer_price_history ADD CONSTRAINT fk_price_history_tenant_offer FOREIGN KEY(account_id,offer_id) REFERENCES offers(account_id,id) ON DELETE CASCADE NOT VALID;
ALTER TABLE autopilot_rules ADD CONSTRAINT fk_autopilot_tenant_category FOREIGN KEY(account_id,category_id) REFERENCES categories(account_id,id) ON DELETE NO ACTION NOT VALID;
ALTER TABLE social_posts ADD CONSTRAINT fk_social_posts_tenant_offer FOREIGN KEY(account_id,offer_id) REFERENCES offers(account_id,id) ON DELETE CASCADE NOT VALID;
ALTER TABLE click_events ADD CONSTRAINT fk_clicks_tenant_publication FOREIGN KEY(account_id,publication_id) REFERENCES publications(account_id,id) ON DELETE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS idx_publications_due ON publications(status,next_attempt_at,priority DESC,created_at) WHERE status IN ('READY','RETRY','SCHEDULED','DISPATCHING');
CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON marketplace_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS standalone_scheduled_jobs (
  id TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_at TIMESTAMPTZ NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_standalone_jobs_due ON standalone_scheduled_jobs(status,run_at);

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS image_storage_key TEXT;
ALTER TABLE publications ADD CONSTRAINT fk_publication_tenant_whatsapp FOREIGN KEY(account_id,connection_id) REFERENCES whatsapp_connections(account_id,id) ON DELETE NO ACTION NOT VALID;
ALTER TABLE publications ADD CONSTRAINT fk_publication_tenant_telegram FOREIGN KEY(account_id,telegram_connection_id) REFERENCES telegram_connections(account_id,id) ON DELETE NO ACTION NOT VALID;
ALTER TABLE content_assets VALIDATE CONSTRAINT fk_assets_tenant_offer;
ALTER TABLE offer_price_history VALIDATE CONSTRAINT fk_price_history_tenant_offer;
ALTER TABLE autopilot_rules VALIDATE CONSTRAINT fk_autopilot_tenant_category;
ALTER TABLE social_posts VALIDATE CONSTRAINT fk_social_posts_tenant_offer;
ALTER TABLE click_events VALIDATE CONSTRAINT fk_clicks_tenant_publication;
ALTER TABLE publications VALIDATE CONSTRAINT fk_publication_tenant_whatsapp;
ALTER TABLE publications VALIDATE CONSTRAINT fk_publication_tenant_telegram;
