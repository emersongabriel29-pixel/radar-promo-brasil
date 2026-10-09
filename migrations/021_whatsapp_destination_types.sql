-- Explicit WhatsApp destination kinds; legacy destinations default to groups.
ALTER TABLE promo_groups ADD COLUMN IF NOT EXISTS whatsapp_destination_type TEXT NOT NULL DEFAULT 'GROUP';
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='promo_groups_whatsapp_destination_type_check') THEN ALTER TABLE promo_groups ADD CONSTRAINT promo_groups_whatsapp_destination_type_check CHECK (whatsapp_destination_type IN ('GROUP','CHANNEL','COMMUNITY')); END IF; END $$;
