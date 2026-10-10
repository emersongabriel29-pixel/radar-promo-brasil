-- Reconcile the live Hatchable schema with the standalone repository's WhatsApp destination guard.
-- Existing legacy destinations default to GROUP; current production WhatsApp groups are paused and have no external IDs.
ALTER TABLE promo_groups ADD COLUMN IF NOT EXISTS whatsapp_destination_type TEXT NOT NULL DEFAULT 'GROUP';
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='promo_groups_whatsapp_destination_type_check') THEN ALTER TABLE promo_groups ADD CONSTRAINT promo_groups_whatsapp_destination_type_check CHECK (whatsapp_destination_type IN ('GROUP','CHANNEL','COMMUNITY')); END IF; END $$;
