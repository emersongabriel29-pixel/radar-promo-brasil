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
    WHERE o.status IN ('PENDING','NEEDS_REVIEW','READY','APPROVED')
      AND NULLIF(trim(o.title),'') IS NOT NULL
      AND o.current_price>0
      AND COALESCE(o.validation_status,'') <> 'REJECTED'
      AND NULLIF(trim(o.affiliate_url),'') LIKE 'https://%'
      AND NOT EXISTS(SELECT 1 FROM publications p WHERE p.account_id=o.account_id AND p.offer_id=o.id)
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
        WHERE COALESCE(s.enabled,false)=true
          AND o.imported_by='CHROME_EXTENSION' AND o.status='PENDING' AND COALESCE(o.validation_status,'') <> 'REJECTED'
          AND NULLIF(trim(o.title),'') IS NOT NULL AND o.current_price>0
          AND NULLIF(trim(o.affiliate_url),'') LIKE 'https://%'
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