import { scheduler } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];

/**
 * Runs marketplace ingestion separately from maintenance and publishing jobs.
 * Runs hourly to comply with the Hatchable Free plan's minimum cron interval.
 * Each call remains responsible for its own API error handling.
 */
export default async function handler(req, res) {
  // Keep this cron dedicated to Shopee. Lomadee and AliExpress have independent schedules.
  const results = {
    ok: true,
    shopee: { ok: true, accounts: 0, scanned: 0, imported: 0, duplicates: 0, skipped: 0, failed: 0 }
  };
  try {
    results.shopee = await scheduler.now('/api/jobs/shopee');
  } catch (error) {
    results.shopee = { ok: false, error: String(error?.code || error?.name || 'ERROR').slice(0, 60) };
    console.error('marketplace shopee ingestion failed', results.shopee.error);
  }
  results.ok = results.shopee.ok !== false;
  return res.json(results);
}