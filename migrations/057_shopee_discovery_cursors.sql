CREATE TABLE IF NOT EXISTS shopee_discovery_cursors (
  account_id text NOT NULL,
  discovery_key text NOT NULL,
  sort_type integer NOT NULL,
  next_page integer NOT NULL DEFAULT 1 CHECK (next_page >= 1),
  pages_completed bigint NOT NULL DEFAULT 0,
  last_page_count integer NOT NULL DEFAULT 0,
  last_has_next_page boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, discovery_key, sort_type)
);

CREATE INDEX IF NOT EXISTS shopee_discovery_cursors_updated
  ON shopee_discovery_cursors(account_id, updated_at DESC);
