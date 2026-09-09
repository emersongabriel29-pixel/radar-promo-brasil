CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  original_price INTEGER,
  current_price INTEGER NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  affiliate_url TEXT NOT NULL,
  image_url TEXT,
  score INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'PENDING',
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
