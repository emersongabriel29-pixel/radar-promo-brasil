import { db } from 'hatchable';
import { classifyLomadeeProduct } from 'lib/lomadee-catalog.js';
import { directImageUrl } from 'lib/validation.js';

export const access = 'scheduler';
export const methods = ['POST'];

const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const parseMoney = value => {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().replace(/[^0-9,.-]/g, '');
  if (!raw) return null;
  const comma = raw.lastIndexOf(','), dot = raw.lastIndexOf('.');
  let normalized = raw;
  if (comma >= 0 && dot >= 0) normalized = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  else if (comma >= 0) normalized = raw.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const priceCents = value => {
  const n = parseMoney(value);
  return n !== null ? Math.round(n * 100) : null;
};
function normalizeProduct(row) {
  const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const options = Array.isArray(raw.options) ? raw.options : [];
  const option = options.find(item => item?.available !== false) || options[0] || {};
  const pricing = Array.isArray(option.pricing) ? option.pricing[0] || {} : {};
  const title = clean(option.name || raw.name || row.title, 300);
  const image = raw.images?.[0]?.url || option.images?.[0]?.url || row.image_url || '';
  const productUrl = clean(raw.url || row.product_url, 2000);
  const currentPrice = priceCents(pricing.price) ?? priceCents(pricing.listPrice) ?? priceCents(row.price_cents ? Number(row.price_cents) / 100 : null);
  const classification = classifyLomadeeProduct(raw);
  let status = 'READY_FOR_LINK';
  let reason = '';
  if (classification.blocked) {
    status = 'BLOCKED_SAFETY';
    reason = 'Produto bloqueado pela política de medicamentos.';
  } else if (raw.available === false || option.available === false || row.available === false) {
    status = 'UNAVAILABLE';
    reason = 'Produto indisponível na origem.';
  } else if (!title || !currentPrice || !directImageUrl(image) || !/^https:\/\//i.test(productUrl)) {
    status = 'NEEDS_DATA';
    reason = 'Faltam título, preço válido, imagem HTTPS ou URL do produto.';
  }
  return {
    id: row.id,
    title,
    imageUrl: directImageUrl(image) ? image : '',
    productUrl: /^https:\/\//i.test(productUrl) ? productUrl : '',
    priceCents: currentPrice,
    status,
    reason
  };
}

export default async function handler(req, res) {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.body?.limit) || 50)));
  await db.query(`
    UPDATE affiliate_discovery_items
    SET processing_status='DISCOVERED',processing_error=''
    WHERE marketplace='LOMADEE' AND kind='PRODUCT'
      AND processing_status='PROCESSING' AND last_seen_at<now()-interval '10 minutes'
  `);
  const claimed = await db.query(`
    WITH batch AS (
      SELECT id FROM affiliate_discovery_items
      WHERE marketplace='LOMADEE' AND kind='PRODUCT'
        AND processing_status IN ('DISCOVERED','FAILED')
      ORDER BY first_seen_at,id
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE affiliate_discovery_items i
    SET processing_status='PROCESSING',processing_error='',last_seen_at=now()
    FROM batch WHERE i.id=batch.id
    RETURNING i.id,i.title,i.product_url,i.image_url,i.price_cents,i.available,i.raw_data
  `, [limit]);
  const results = claimed.rows.map(normalizeProduct);
  const summary = { READY_FOR_LINK: 0, NEEDS_DATA: 0, BLOCKED_SAFETY: 0, UNAVAILABLE: 0 };
  for (const item of results) summary[item.status] = (summary[item.status] || 0) + 1;
  let failed = 0;
  try {
    if (results.length) await db.query(`
      UPDATE affiliate_discovery_items i
      SET title=x.title,image_url=x.image_url,product_url=x.product_url,price_cents=x.price_cents,
          processing_status=x.processing_status,processing_error=x.processing_error,
          processed_at=now(),last_seen_at=now()
      FROM jsonb_to_recordset($1::jsonb) AS x(
        id text,title text,image_url text,product_url text,price_cents bigint,
        processing_status text,processing_error text
      )
      WHERE i.id=x.id AND i.marketplace='LOMADEE' AND i.kind='PRODUCT'
    `, [JSON.stringify(results.map(item => ({
      id:item.id,title:item.title,image_url:item.imageUrl,product_url:item.productUrl,
      price_cents:item.priceCents,processing_status:item.status,processing_error:item.reason
    })))]);
  } catch {
    failed = results.length;
    await db.query(`
      UPDATE affiliate_discovery_items
      SET processing_status='FAILED',processing_error='QUEUE_BATCH_UPDATE_FAILED'
      WHERE marketplace='LOMADEE' AND kind='PRODUCT' AND processing_status='PROCESSING'
        AND id = ANY($1::text[])
    `, [results.map(item=>item.id)]);
  }
  const ready = summary.READY_FOR_LINK;
  const needsData = summary.NEEDS_DATA;
  const blocked = summary.BLOCKED_SAFETY;
  const unavailable = summary.UNAVAILABLE;
  const counts = (await db.query(`
    SELECT processing_status,count(*)::int AS count
    FROM affiliate_discovery_items
    WHERE marketplace='LOMADEE' AND kind='PRODUCT'
    GROUP BY processing_status ORDER BY processing_status
  `)).rows;
  const remaining = counts.filter(row => ['DISCOVERED','FAILED','PROCESSING'].includes(row.processing_status)).reduce((sum,row)=>sum+row.count,0);
  return res.json({
    ok: failed === 0,
    provider: 'LOMADEE',
    processed: results.length,
    readyForLink: ready,
    needsData,
    blockedBySafety: blocked,
    unavailable,
    failed,
    remaining,
    counts,
    readOnlySource: true,
    offersCreated: 0,
    publicationsCreated: 0,
    messagesSent: 0,
    note: 'A fila normaliza e classifica os produtos para revisão/geração de link. Não cria ofertas, não aprova, não aciona autopilot e não publica.'
  });
}