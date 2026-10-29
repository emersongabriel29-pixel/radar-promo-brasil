-- Harden reporting relations so account_id cannot be paired with another tenant's entity.
-- Existing rows are checked on a later validation pass; NOT VALID keeps this migration
-- deployable while enforcing the relationship for all new and changed rows.

CREATE UNIQUE INDEX IF NOT EXISTS uq_groups_account_id_reporting
  ON promo_groups(account_id,id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_account_id_reporting
  ON offers(account_id,id);

DO $$ BEGIN
  ALTER TABLE click_events
    ADD CONSTRAINT fk_click_events_account_offer
    FOREIGN KEY (account_id,offer_id)
    REFERENCES offers(account_id,id)
    ON DELETE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE click_events
    ADD CONSTRAINT fk_click_events_account_group
    FOREIGN KEY (account_id,group_id)
    REFERENCES promo_groups(account_id,id)
    ON DELETE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_sales
    ADD CONSTRAINT fk_affiliate_sales_account_offer
    FOREIGN KEY (account_id,offer_id)
    REFERENCES offers(account_id,id)
    ON DELETE SET NULL (offer_id)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE affiliate_sales
    ADD CONSTRAINT fk_affiliate_sales_account_group
    FOREIGN KEY (account_id,group_id)
    REFERENCES promo_groups(account_id,id)
    ON DELETE SET NULL (group_id)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_click_events_account_offer
  ON click_events(account_id,offer_id,occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_account_offer
  ON affiliate_sales(account_id,offer_id,ordered_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_account_group
  ON affiliate_sales(account_id,group_id,ordered_at DESC);

-- The live database was checked for orphaned relationships before deployment.
-- Validate existing rows now, while keeping the FK additions idempotent.
ALTER TABLE click_events VALIDATE CONSTRAINT fk_click_events_account_offer;
ALTER TABLE click_events VALIDATE CONSTRAINT fk_click_events_account_group;
ALTER TABLE affiliate_sales VALIDATE CONSTRAINT fk_affiliate_sales_account_offer;
ALTER TABLE affiliate_sales VALIDATE CONSTRAINT fk_affiliate_sales_account_group;
