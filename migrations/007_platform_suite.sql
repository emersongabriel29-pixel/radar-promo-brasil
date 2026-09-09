CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  owner_member_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Minha operação',
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'TRIAL',
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_rules (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  affiliate_tag TEXT NOT NULL DEFAULT '',
  subid_template TEXT NOT NULL DEFAULT '{group}',
  conversion_endpoint TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, marketplace)
);

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'N8N',
  external_id TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'PAUSED',
  last_seen_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_costs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES promo_groups(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storefront_settings (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Ofertas selecionadas',
  description TEXT NOT NULL DEFAULT 'Promoções atualizadas para você.',
  logo_url TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#ff6a2a',
  published BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'MANUAL',
  provider_customer_id TEXT NOT NULL DEFAULT '',
  provider_subscription_id TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'TRIAL',
  status TEXT NOT NULL DEFAULT 'TRIALING',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_connections (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  external_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, network)
);

ALTER TABLE promo_groups ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE promo_groups ADD COLUMN IF NOT EXISTS marketplace_subids JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE promo_groups ADD COLUMN IF NOT EXISTS lead_cost_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE queues ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE queues ADD COLUMN IF NOT EXISTS priority_mode TEXT NOT NULL DEFAULT 'NEWEST_FIRST';
ALTER TABLE queues ADD COLUMN IF NOT EXISTS mention_all BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE queues ADD COLUMN IF NOT EXISTS link_preview BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS connection_id TEXT REFERENCES whatsapp_connections(id) ON DELETE SET NULL;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS mention_all BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS storefront_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_member_id);
CREATE INDEX IF NOT EXISTS idx_connections_account_status ON whatsapp_connections(account_id,status,priority);
CREATE INDEX IF NOT EXISTS idx_publications_priority ON publications(status,priority DESC,created_at);
CREATE INDEX IF NOT EXISTS idx_offers_storefront ON offers(account_id,storefront_visible,status);

INSERT INTO integration_health(name,status,details) VALUES
  ('amazon','PENDING','Aguardando tag e acesso oficial'),
  ('instagram','PENDING','Aguardando conta profissional e autorização'),
  ('payments','PENDING','Aguardando provedor de pagamentos')
ON CONFLICT(name) DO NOTHING;
