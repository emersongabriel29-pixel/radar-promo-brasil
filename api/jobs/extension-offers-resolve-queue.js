import { db } from 'hatchable';
import { resolveExtensionOffer } from 'lib/extension-offer-resolver.js';

export const access = 'scheduler';
export const methods = ['POST'];

const BATCH_SIZE = 5;

export default async function handler(req, res) {
  const dryRun = req.body?.dryRun === true || String(req.body?.dryRun ?? req.query?.dryRun ?? '').toLowerCase() === 'true';
  const rows = (await db.query(
    `SELECT o.id,o.account_id,o.source
     FROM offers o
     WHERE o.imported_by IN ('CHROME_EXTENSION','ANDROID_SHARE')
       AND o.status='PENDING'
       AND upper(o.source) IN ('SHOPEE','ALIEXPRESS','AMAZON','MERCADO_LIVRE','MERCADOLIVRE','LOMADEE','RAKUTEN')
       AND (o.classification_reason LIKE 'Aguardando enriquecimento automático%'
         OR o.updated_at < now()-interval '6 hours')
       AND NOT EXISTS (
         SELECT 1 FROM offer_price_history ph
         WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
           AND ph.source_type='OFFICIAL_API' AND ph.verified_at>now()-interval '24 hours'
       )
     ORDER BY o.created_at ASC
     LIMIT $1`,
    [BATCH_SIZE]
  )).rows;

  if (dryRun) {
    return res.json({
      ok: true,
      dryRun: true,
      selected: rows.length,
      batchSize: BATCH_SIZE,
      preview: rows.map(row => ({ id: row.id, source: row.source }))
    });
  }

  const results = [];
  for (const row of rows) {
    try {
      const result = await resolveExtensionOffer(row.id, row.account_id);
      const payload = result?.body || {};
      results.push({
        id: row.id,
        source: row.source,
        httpStatus: result?.httpStatus || 200,
        verified: payload.verified === true,
        status: payload.status || 'UNKNOWN',
        reason: payload.reason || payload.error || null
      });
    } catch (error) {
      results.push({
        id: row.id,
        source: row.source,
        httpStatus: 500,
        error: String(error?.code || error?.name || 'ERROR').slice(0, 80)
      });
    }
  }

  const failed = results.filter(row => row.httpStatus >= 500).length;
  return res.json({
    ok: failed === 0,
    selected: rows.length,
    processed: results.length,
    verified: results.filter(row => row.verified).length,
    review: results.filter(row => row.status === 'REVIEW').length,
    failed,
    publicationsCreated: 0,
    messagesSent: 0,
    results
  });
}