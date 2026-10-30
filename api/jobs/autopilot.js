import { db } from 'hatchable';
import { enqueueMatches } from 'lib/autopilot.js';
export const access = 'scheduler';
export const methods = ['POST'];
export default async function(req, res) {
  const dryRun = req.body?.dryRun === true;
  const accounts = (await db.query("SELECT DISTINCT o.account_id FROM offers o JOIN accounts a ON a.id=o.account_id WHERE o.status IN ('APPROVED','PENDING','READY','NEEDS_REVIEW','REJECTED') AND a.status='ACTIVE'")).rows;
  const totals = { evaluated: 0, queued: 0, wouldQueue: 0, telegramQueued: 0, wouldTelegramQueue: 0, whatsappQueued: 0, wouldWhatsappQueue: 0, blockedAffiliate: 0, blockedPrice: 0, blockedMedication: 0, blockedDuplicate: 0, failed: 0 };
  for (const account of accounts) {
    try { const result=await enqueueMatches(account.account_id, '', { dryRun }); for (const key of Object.keys(totals)) totals[key]+=result[key]||0; }
    catch(error) { totals.failed++; console.error('autopilot account failed', account.account_id, error.code || error.name); }
  }
  return res.json({ ok: totals.failed === 0, dryRun, accounts: accounts.length, ...totals });
}