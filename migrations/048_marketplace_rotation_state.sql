CREATE TABLE IF NOT EXISTS marketplace_rotation_state (
  account_id text NOT NULL,
  group_id text NOT NULL,
  last_source text,
  consecutive_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, group_id)
);