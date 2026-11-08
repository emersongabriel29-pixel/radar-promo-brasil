CREATE TABLE IF NOT EXISTS youtube_oauth_states (
  state TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_youtube_oauth_states_created ON youtube_oauth_states(created_at);
CREATE TABLE IF NOT EXISTS youtube_connections (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  channel_id TEXT NOT NULL DEFAULT '',
  channel_title TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE video_studio_projects ADD COLUMN IF NOT EXISTS youtube_video_id TEXT NOT NULL DEFAULT '';
ALTER TABLE video_studio_projects ADD COLUMN IF NOT EXISTS youtube_video_url TEXT NOT NULL DEFAULT '';
ALTER TABLE video_studio_projects ADD COLUMN IF NOT EXISTS youtube_published_at TIMESTAMPTZ;