-- The first recovery pass replayed migrations 001-007 after tenant isolation.
-- Restore migration 008's intended account-scoped uniqueness by removing legacy global indexes.
DROP INDEX IF EXISTS public.uq_offers_fingerprint;
DROP INDEX IF EXISTS public.uq_publications_idempotency;
