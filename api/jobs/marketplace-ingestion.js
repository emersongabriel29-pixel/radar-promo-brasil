import { scheduler } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];

/**
 * Runs marketplace ingestion separately from maintenance and publishing jobs.
 * Runs hourly to comply with the Hatchable Free plan's minimum cron interval.
 * Each call remains responsible for its own API error handling.
 */
export default async function handler(req, res) {
  const results = {
    ok: true,
    lomadee: { ok: true, accounts: 0, scanned: 0, imported: 0, duplicates: 0, skipped: 0, failed: 0 },
    shopee: { ok: true, accounts: 0, scanned: 0, imported: 0, duplicates: 0, skipped: 0, failed: 0 },
    aliexpressReview: { ok: true, scanned: 0, validated: 0, rejected: 0, failed: 0, publicationTriggered: false, messagesSent: 0 }
  };
  try {
    results.lomadee = await scheduler.now('/api/jobs/lomadee');
  } catch (error) {
    results.lomadee = { ok: false, error: String(error?.code || error?.name || 'ERROR').slice(0, 60) };
    console.error('marketplace lomadee ingestion failed', results.lomadee.error);
  }
  try {
    results.shopee = await scheduler.now('/api/jobs/shopee');
  } catch (error) {
    results.shopee = { ok: false, error: String(error?.code || error?.name || 'ERROR').slice(0, 60) };
    console.error('marketplace shopee ingestion failed', results.shopee.error);
  }
  try {
    results.aliexpressReview = await scheduler.now('/api/jobs/aliexpress-review');
  } catch (error) {
    results.aliexpressReview = { ok: false, error: String(error?.code || error?.name || 'ERROR').slice(0, 60), publicationTriggered: false, messagesSent: 0 };
    console.error('marketplace aliexpress review failed', results.aliexpressReview.error);
  }
  results.ok = results.lomadee.ok !== false && results.shopee.ok !== false && results.aliexpressReview.ok !== false;
  return res.json(results);
}
