import { db, scheduler } from 'hatchable';
import { enqueueMatches } from 'lib/autopilot.js';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function(req, res) {
  const dryRun = req.body?.dryRun === true;
  const totals = {
    evaluated: 0, queued: 0, wouldQueue: 0, telegramQueued: 0, wouldTelegramQueue: 0,
    whatsappQueued: 0, wouldWhatsappQueue: 0, blockedAffiliate: 0, blockedPrice: 0,
    blockedMedication: 0, blockedDuplicate: 0, failed: 0
  };

  // Only wake accounts that have an approved offer with a fresh official price.
  // This avoids rescoring every historical offer on every hourly tick.
  const accounts = (await db.query(`
    SELECT DISTINCT o.account_id
    FROM offers o
    JOIN accounts a ON a.id=o.account_id AND a.status='ACTIVE'
    WHERE o.status='APPROVED'
      AND NULLIF(trim(o.affiliate_url),'') IS NOT NULL
      AND (o.image_storage_key IS NOT NULL OR NULLIF(trim(o.image_url),'') IS NOT NULL)
      AND EXISTS (
        SELECT 1 FROM offer_price_history ph
        WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
          AND ph.source_type='OFFICIAL_API' AND ph.verified_at IS NOT NULL
          AND ph.verified_at>now()-interval '24 hours'
          AND ph.price=o.current_price
          AND ph.original_price IS NOT DISTINCT FROM o.original_price
          AND ph.verified_at=(
            SELECT max(ph2.verified_at) FROM offer_price_history ph2
            WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id
              AND ph2.source_type='OFFICIAL_API'
          )
      )
    ORDER BY o.account_id
  `)).rows;

  for (const account of accounts) {
    try {
      const result = await enqueueMatches(account.account_id, '', { dryRun });
      for (const key of Object.keys(totals)) totals[key] += result[key] || 0;
    } catch (error) {
      totals.failed++;
      console.error('autopilot account failed', account.account_id, error.code || error.name);
    }
  }

  // Extension approval runs only when there is a verified pending import to process.
  let extensionAutopublish = { ok: true, scanned: 0, approved: 0, queued: 0, blocked: 0, failed: 0, skipped: true };
  if (!dryRun) {
    const pendingExtension = (await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM offers o
        JOIN accounts a ON a.id=o.account_id AND a.status='ACTIVE'
        LEFT JOIN extension_autopublish_settings s ON s.account_id=o.account_id
        WHERE COALESCE(s.enabled,true)=true
          AND o.imported_by='CHROME_EXTENSION' AND o.status='PENDING'
          AND o.created_at>now()-interval '7 days'
          AND EXISTS (
            SELECT 1 FROM offer_price_history ph
            WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
              AND ph.source_type='OFFICIAL_API' AND ph.verified_at>now()-interval '24 hours'
              AND ph.price=o.current_price
              AND ph.original_price IS NOT DISTINCT FROM o.original_price
              AND ph.verified_at=(
                SELECT max(ph2.verified_at) FROM offer_price_history ph2
                WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id
                  AND ph2.source_type='OFFICIAL_API'
              )
          )
      ) AS pending
    `)).rows[0]?.pending === true;

    if (pendingExtension) {
      try {
        extensionAutopublish = await scheduler.now('/api/jobs/extension-autopublish');
      } catch (error) {
        extensionAutopublish = { ok: false, error: String(error?.code || error?.name || 'ERROR').slice(0, 60) };
        totals.failed++;
      }
    }
  }

  return res.json({
    ok: totals.failed === 0, dryRun, accounts: accounts.length,
    idle: accounts.length === 0 && extensionAutopublish.skipped === true,
    ...totals, extensionAutopublish
  });
}