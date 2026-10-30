import { scheduler } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function handler(req, res) {
  const results = {
    ok: true,
    shopee: { ok: true, accounts: 0, scanned: 0, imported: 0, duplicates: 0, skipped: 0, failed: 0 },
    aiEnrichment: { ok: true, processed: 0, classified: 0, copyGenerated: 0, failed: 0 }
  };
  try {
    results.shopee = await scheduler.now('/api/jobs/shopee');
  } catch (error) {
    results.shopee = { ok: false, error: String(error?.code || error?.name || 'ERROR').slice(0, 60) };
    console.error('marketplace shopee ingestion failed', results.shopee.error);
  }
  try {
    results.aiEnrichment = await scheduler.now('/api/jobs/ai-enrichment');
  } catch (error) {
    results.aiEnrichment = { ok: false, error: String(error?.code || error?.name || 'ERROR').slice(0, 60) };
    console.error('marketplace ai enrichment failed', results.aiEnrichment.error);
  }
  results.ok = results.shopee.ok !== false && results.aiEnrichment.ok !== false;
  return res.json(results);
}