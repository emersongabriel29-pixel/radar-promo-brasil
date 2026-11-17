
CREATE TABLE IF NOT EXISTS private.rpo_catalog_migration_batches (run_id text NOT NULL,source_table text NOT NULL,cursor_id text NOT NULL,read_count integer NOT NULL,inserted_count integer NOT NULL,completed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(run_id,source_table,cursor_id));
ALTER TABLE private.rpo_catalog_migration_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.rpo_catalog_migration_batches FROM PUBLIC,anon,authenticated;
