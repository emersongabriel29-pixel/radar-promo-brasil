-- PROPOSTA NÃO EXECUTADA.
-- Habilita RLS em todas as tabelas do schema public.
-- Sem policies, anon/authenticated ficam em deny-by-default.
-- A conexão server-side com role privilegiada pode bypassar RLS; não expor a Data API
-- antes de definir e testar políticas tenant-aware por account_id.
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
  END LOOP;
END
$$;
