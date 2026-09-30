import { db } from 'hatchable';
import { enqueueMatches } from 'lib/autopilot.js';
export const access = 'scheduler';
export const methods = ['POST'];
export default async function(req, res) {
  const accounts = (await db.query("SELECT DISTINCT r.account_id FROM autopilot_rules r JOIN accounts a ON a.id=r.account_id WHERE r.status='ACTIVE' AND a.status='ACTIVE'")).rows;
  const totals = { evaluated: 0, queued: 0, telegramQueued: 0, whatsappQueued: 0, blockedAffiliate: 0, failed: 0 };
  for (const account of accounts) {
    try { const result=await enqueueMatches(account.account_id); for (const key of Object.keys(totals)) totals[key]+=result[key]||0; }
    catch(error) { totals.failed++; console.error('autopilot account failed', account.account_id, error.code || error.name); }
  }
  return res.json({ ok: totals.failed === 0, accounts: accounts.length, ...totals });
}
