CREATE TABLE IF NOT EXISTS rpo_favorites (
  user_id text NOT NULL, offer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, offer_id)
);
CREATE TABLE IF NOT EXISTS rpo_votes (
  user_id text NOT NULL, offer_id text NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1,1)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, offer_id)
);
CREATE INDEX IF NOT EXISTS rpo_votes_offer ON rpo_votes(offer_id);
CREATE TABLE IF NOT EXISTS rpo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, offer_id text NOT NULL,
  display_name text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rpo_comments_offer_time ON rpo_comments(offer_id,created_at,id);
CREATE INDEX IF NOT EXISTS rpo_comments_user ON rpo_comments(user_id);
CREATE TABLE IF NOT EXISTS rpo_notification_preferences (
  user_id text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rpo_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  offer_id text, title text NOT NULL, body text NOT NULL DEFAULT '',
  dedupe_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz, UNIQUE (user_id,dedupe_key)
);
CREATE INDEX IF NOT EXISTS rpo_notifications_user_time ON rpo_notifications(user_id,created_at,id);

CREATE INDEX IF NOT EXISTS rpo_comments_offer_visible_time ON rpo_comments(offer_id,status,created_at DESC,id DESC);
