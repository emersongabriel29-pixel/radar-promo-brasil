CREATE TABLE IF NOT EXISTS messaging_compliance_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('INSTAGRAM','MESSENGER','WHATSAPP')),
  event_type TEXT NOT NULL CHECK (event_type IN ('INTERACTION','OPT_IN','SEND_ATTEMPT','SENT','BLOCKED')),
  contact_hash TEXT NOT NULL DEFAULT '',
  promotional BOOLEAN NOT NULL DEFAULT false,
  consent_recorded BOOLEAN NOT NULL DEFAULT false,
  last_interaction_at TIMESTAMPTZ,
  decision TEXT NOT NULL DEFAULT 'NOT_APPLICABLE' CHECK (decision IN ('ALLOWED','BLOCKED','NOT_APPLICABLE')),
  reason TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messaging_compliance_account_time
  ON messaging_compliance_events(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_compliance_decision
  ON messaging_compliance_events(account_id,decision,created_at DESC);

