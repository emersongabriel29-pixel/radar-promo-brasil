ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_purchase_cents INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupons_discount_type_check') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_discount_type_check
      CHECK (discount_type IN ('TEXT','PERCENT','FIXED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupons_discount_value_check') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_discount_value_check
      CHECK (discount_value >= 0 AND max_discount_cents >= 0 AND min_purchase_cents >= 0);
  END IF;
END $$;