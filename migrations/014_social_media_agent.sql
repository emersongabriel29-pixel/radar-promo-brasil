ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_kind_check;

ALTER TABLE content_assets
  ADD CONSTRAINT content_assets_kind_check
  CHECK (kind IN (
    'PROMO_TEXT','COUPON_TEXT','INSTAGRAM_CAPTION','FACEBOOK_POST',
    'AD_COPY','VIDEO_SCRIPT','CAROUSEL','IMAGE','VIDEO','SOCIAL_AGENT'
  ));
