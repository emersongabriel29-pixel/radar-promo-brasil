ALTER TABLE offers ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS imported_by TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_fingerprint ON offers(fingerprint) WHERE fingerprint IS NOT NULL;

ALTER TABLE publications ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_publications_idempotency ON publications(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  item_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE(provider,event_key)
);

CREATE TABLE IF NOT EXISTS automation_settings (
  id TEXT PRIMARY KEY,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  minimum_score INTEGER NOT NULL DEFAULT 70,
  maximum_batch INTEGER NOT NULL DEFAULT 20,
  require_image BOOLEAN NOT NULL DEFAULT true,
  require_affiliate_link BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO automation_settings(id) VALUES('default') ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS integration_health (
  name TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'PENDING',
  details TEXT NOT NULL DEFAULT '',
  last_checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO integration_health(name,status,details) VALUES
  ('mercadolivre','PENDING','Aguardando teste autenticado'),
  ('shopee','PENDING','Aguardando acesso de conversão'),
  ('whatsapp','PENDING','Aguardando número e grupos'),
  ('n8n','READY_FOR_SETUP','Ponte segura criada'),
  ('ai','READY_FOR_SETUP','Rota de geração criada')
ON CONFLICT(name) DO NOTHING;
