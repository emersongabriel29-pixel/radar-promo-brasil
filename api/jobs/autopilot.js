import { db } from 'hatchable';
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

  // Wake accounts with technically complete offers that have not entered a publication queue.
  // A bounded hourly batches keep ingestion inside the Free scheduler and hosting execution budget; commercial signals never exclude products.
  const accounts = (await db.query(`
    SELECT DISTINCT o.account_id
    FROM offers o
    JOIN accounts a ON a.id=o.account_id AND a.status='ACTIVE'
    LEFT JOIN extension_autopublish_settings s ON s.account_id=o.account_id
    WHERE (COALESCE(o.imported_by,'')<>'CHROME_EXTENSION' OR o.status IN ('APPROVED','READY') OR COALESCE(s.enabled,false)=true) AND o.status IN ('PENDING','NEEDS_REVIEW','READY','APPROVED')
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

  // Extension imports have their own recurring bounded worker; no one-shot task per import.
  const extensionAutopublish = { ok: true, scheduledSeparately: true };

  return res.json({
    ok: totals.failed === 0, dryRun, accounts: accounts.length,
    idle: accounts.length === 0,
    ...totals, extensionAutopublish
  });
}