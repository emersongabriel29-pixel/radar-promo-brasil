import { db } from '../../hatchable/index.js';
import { calculateRadarScore, classifyRadarScore } from '../../lib/radar.js';

export const access = 'member';

async function getAccountId(member) {
  const memberId = String(member?.id || '').trim();
  if (!memberId) return '';
  const result = await db.query('SELECT id FROM accounts WHERE owner_member_id = $1 LIMIT 1', [memberId]);
  return String(result.rows?.[0]?.id || '');
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Não autorizado.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  const accountId = await getAccountId(req.member);
  if (!accountId) return res.status(401).json({ error: 'Conta não identificada' });

  const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 20)));
  const minScore = Math.min(100, Math.max(0, Number(req.query?.minScore || 0)));
  const category = String(req.query?.category || '').trim();
  const params = [accountId, minScore];
  let categorySql = '';
  if (category) { params.push(category); categorySql = ' AND COALESCE(c.name, \'Ofertas gerais\') = $3 '; }
  params.push(limit);
  const limitParam = category ? '$4' : '$3';
  const sql = `SELECT o.*, COALESCE(c.name, 'Ofertas gerais') AS category_name FROM offers o LEFT JOIN categories c ON c.id = o.category_id WHERE o.account_id = $1 AND COALESCE(o.radar_score, 35) >= $2 AND COALESCE(o.status, 'READY') NOT IN ('REJECTED','FAILED') ${categorySql} ORDER BY COALESCE(o.radar_score, 35) DESC, o.created_at DESC LIMIT ${limitParam}`;
  const rows = (await db.query(sql, params)).rows || [];

  const opportunities = rows.map(o => {
    const radar = calculateRadarScore({ currentPrice: o.current_price, originalPrice: o.original_price, lowestPrice: o.price_lowest, averagePrice: o.price_average, historyCount: o.price_history_count, title: o.title, coupon: Boolean(o.coupon_url), categoryMatch: true });
    return { ...o, radar_score: radar.score, radar_reasons: radar.reasons, radar: classifyRadarScore(radar.score) };
  });
  return res.json({ opportunities, total: opportunities.length, filters: { minScore, category: category || null } });
}
