import { storage } from 'hatchable';
import { db } from 'lib/radar-db.js';
import { config } from 'hatchable';
import { publicFeedImages } from 'lib/feed-images.js';

export const access = 'public';
export const methods = ['GET'];

async function sameSecret(a, b) {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const x = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(a))));
  const y = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(b))));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export default async function(req, res) {
  const expected = await config.get('RADAR_OFFERS_FEED_TOKEN');
  if (!expected) return res.status(503).json({ error: 'Feed externo ainda não configurado.', code: 'FEED_NOT_CONFIGURED' });
  const auth = String(req.headers.authorization || '');
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!(await sameSecret(expected, supplied))) return res.status(401).json({ error: 'Não autorizado.' });

  const slug = 'emersongabriel29-888956';
  const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page || '1', 10) || 1));
  const limit = Math.max(1, Math.min(60, Number.parseInt(req.query.limit || '30', 10) || 30));
  const q = String(req.query.q || '').trim().slice(0, 120);
  const category = String(req.query.category || '').trim().slice(0, 80);
  const sort = String(req.query.sort || 'recent');
  const order = sort === 'discount' ? 'o.discount_percent DESC, o.created_at DESC' : sort === 'score' ? 'o.radar_score DESC, o.score DESC, o.created_at DESC' : 'o.created_at DESC';
  const params = [slug];
  let filters = `o.status IN ('APPROVED','PUBLISHED')
    AND EXISTS (
      SELECT 1 FROM offer_price_history ph
      WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
        AND ph.source_type='OFFICIAL_API'
        AND ph.verified_at > now()-interval '24 hours'
        AND ph.original_price IS NOT NULL
        AND ph.price=o.current_price
        AND ph.original_price=o.original_price
        AND ph.verified_at=(
          SELECT MAX(ph2.verified_at) FROM offer_price_history ph2
          WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id
            AND ph2.source_type='OFFICIAL_API'
        )
    )`;
  if (q) { params.push('%' + q + '%'); filters += ` AND (o.title ILIKE $2 OR o.source ILIKE $2)`; }
  if (category) { params.push(category); filters += ` AND c.name=$${params.length}`; }
  const offerId = String(req.query.id || '').trim().slice(0,128);
  if (offerId) { params.push(offerId); filters += ` AND o.id=$${params.length}`; }
  const count = await db.query(`
    SELECT count(*)::int AS total
    FROM offers o
    JOIN accounts a ON a.id=o.account_id
    LEFT JOIN categories c ON c.id=o.category_id AND c.account_id=o.account_id
    WHERE a.slug=$1 AND a.status='ACTIVE' AND ${filters}
  `, params);
  const rowsParams = params.concat([limit, (page - 1) * limit]);
  const rows = await db.query(`
    SELECT o.id,o.title,o.source,o.current_price AS "currentPrice",
      o.original_price AS "originalPrice",o.image_url AS "imageUrl",
      o.image_storage_key AS "imageStorageKey",o.affiliate_url AS "affiliateUrl",
      o.discount_percent AS "discountPercent",o.radar_score AS "radarScore",
      o.score,o.coupon_code AS "couponCode",o.created_at AS "createdAt",
      c.name AS "category",c.icon AS "categoryIcon",o.subcategory
    FROM offers o
    JOIN accounts a ON a.id=o.account_id
    LEFT JOIN categories c ON c.id=o.category_id AND c.account_id=o.account_id
    WHERE a.slug=$1 AND a.status='ACTIVE' AND ${filters}
    ORDER BY ${order},o.id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, rowsParams);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({
    source: 'Radar Promo Brasil',
    generatedAt: new Date().toISOString(),
    page, limit, total: count.rows[0]?.total || 0,
    hasMore: page * limit < (count.rows[0]?.total || 0),
    offers: await publicFeedImages(rows.rows, storage)
  });
}
