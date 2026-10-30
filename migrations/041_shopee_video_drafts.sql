CREATE TABLE IF NOT EXISTS shopee_video_drafts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'SHOPEE_VIDEO' CHECK (platform='SHOPEE_VIDEO'),
  product_title TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_image_url TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  script TEXT NOT NULL DEFAULT '',
  video_asset_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','NEEDS_REVIEW','READY')),
  publication_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (publication_enabled=FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shopee_video_drafts_account_time
  ON shopee_video_drafts(account_id, created_at DESC);