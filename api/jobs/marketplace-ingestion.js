// Marketplace workers run on their own declared hourly crons.
// This compatibility endpoint intentionally does not fan out scheduler.now() calls.
export const access = 'scheduler';
export const methods = ['POST'];
export default async function handler(req, res) {
  return res.json({
    ok: true,
    scheduledSeparately: true,
    workers: ['/api/jobs/shopee', '/api/jobs/ai-enrichment', '/api/jobs/lomadee', '/api/jobs/aliexpress']
  });
}