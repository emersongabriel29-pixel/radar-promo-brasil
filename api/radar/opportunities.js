import { db } from '../../hatchable/index.js';
import { calculateRadarScore, classifyRadarScore } from '../../lib/radar.js';

export const access = 'member';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  const accountId = String(req.user?.accountId || req.user?.account_id || req.user?.id || '').trim();
  if (!accountId) return res.status(401).json({ error: 'Conta não identificada' });

  const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 20)));
  const minScore = Math.min(100, Math.max(0, Number(req.query?.minScore || 0)));
  const category = String(req.query?.category || '').trim();

  const params = [accountId, minScore, limit];
  let categorySql = '';
  if (category) { params.splice(2, 0, category); categorySql = ' AND COALESCE(c.name, \'Ofertas gerais\') = $3 '; }
  const limitParam = category ? '$4' : '$3';
  const sql = `
    SELECT o.*, COALESCE(c.name, 'Ofertas gerais') AS category_name
    FROM offers o
    LEFT JOIN categories c ON c.id = o.category_id
    WHERE o.account_id = $1
      AND COALESCE(o.radar_score, 35) >= $2
      AND COALESCE(o.status, 'READY') NOT IN ('REJECTED','FAILED')
      ${categorySql}
    ORDER BY COALESCE(o.radar_score, 35) DESC, o.created_at DESC
    LIMIT ${limitParam}`;

  const result = await db.query(sql, params);
  const rows = result.rows || [];
  const opportunities = rows.map(o => {
    const radar = calculateRadarScore({
      currentPrice: o.current_price,
      originalPrice: o.original_price,
      lowestPrice: o.price_lowest,
      averagePrice: o.price_average,
      historyCount: o.price_history_count,
      title: o.title,
      coupon: Boolean(o.coupon_url),
      categoryMatch: true
    });
    const classification = classifyRadarScore(radar.score);
    return { ...o, radar_score: radar.score, radar_reasons: radar.reasons, radar: classification };
  });

  return res.json({
    opportunities,
    total: opportunities.length,
    filters: { minScore, category: category || null }
  });
}
