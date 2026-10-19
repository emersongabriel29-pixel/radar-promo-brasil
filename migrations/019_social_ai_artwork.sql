ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS image_job_id TEXT;

CREATE INDEX IF NOT EXISTS idx_social_posts_image_job
  ON social_posts(account_id,image_job_id)
  WHERE image_job_id IS NOT NULL;
