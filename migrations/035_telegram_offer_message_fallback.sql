-- Allow a plain-text Telegram publication tied to an approved offer when the merchant image CDN cannot be fetched by Telegram.
ALTER TABLE publications DROP CONSTRAINT IF EXISTS chk_publication_content;
ALTER TABLE publications ADD CONSTRAINT chk_publication_content
  CHECK (
    (content_type='PROMOTION' AND offer_id IS NOT NULL)
    OR (content_type='MESSAGE' AND (schedule_id IS NOT NULL OR offer_id IS NOT NULL))
  );
