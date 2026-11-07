CREATE TABLE IF NOT EXISTS video_studio_projects (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  offer_id TEXT,
  product_title TEXT NOT NULL,
  product_source TEXT NOT NULL DEFAULT '',
  product_url TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  price_cents BIGINT,
  original_price_cents BIGINT,
  template TEXT NOT NULL DEFAULT 'OFERTA',
  duration_seconds INTEGER NOT NULL DEFAULT 15 CHECK (duration_seconds IN (15,30,45,60)),
  script TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  storage_key TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RENDERING','READY','FAILED')),
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_studio_account_time
  ON video_studio_projects(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_studio_status
  ON video_studio_projects(account_id, status, updated_at DESC);