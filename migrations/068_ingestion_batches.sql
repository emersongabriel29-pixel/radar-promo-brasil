CREATE TABLE IF NOT EXISTS ingestion_batches (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id),
  event_id text NOT NULL,
  payload jsonb NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  cursor integer NOT NULL DEFAULT 0 CHECK (cursor>=0),
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','PROCESSING','WAITING_CAPACITY','RETRY','COMPLETED','COMPLETED_WITH_REVIEW')),
  inserted_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  rejected jsonb NOT NULL DEFAULT '[]'::jsonb,
  lease_token text,
  lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,event_id)
);
CREATE INDEX IF NOT EXISTS ingestion_batches_pending ON ingestion_batches(state,next_attempt_at,created_at);
