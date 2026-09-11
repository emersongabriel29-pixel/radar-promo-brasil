import { db } from '../../hatchable/index.js';
import { calculateRadarScore, classifyRadarScore } from '../../lib/radar.js';

export const access = 'member';

export default async function handler(req, res) {
  const accountId = String(req.user?.accountId || req.user?.account_id || req.user?.id || '').trim();
  if (!accountId) return res.status(401).json({ error: 'Conta não identificada' });

  if (req.method === 'GET') {
    const result = await db.query(`SELECT * FROM autopilot_rules WHERE account_id = $1 ORDER BY updated_at DESC`, [accountId]);
    return res.json({ rules: result.rows || [] });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const body = req.body || {};
  const action = String(body.action || '').toUpperCase();

  if (action === 'EVALUATE') {
    const rules = (await db.query(`SELECT * FROM autopilot_rules WHERE account_id = $1 AND status = 'ACTIVE'`, [accountId])).rows || [];
    const offers = (await db.query(`
      SELECT o.*, COALESCE(o.price_lowest, 0) AS lowest_price, COALESCE(o.price_average, 0) AS average_price
      FROM offers o WHERE o.account_id = $1 AND COALESCE(o.status, 'READY') IN ('READY','APPROVED')
      ORDER BY COALESCE(o.radar_score,35) DESC LIMIT 100`, [accountId])).rows || [];

    const matches = [];
    for (const offer of offers) {
      const radar = calculateRadarScore({ currentPrice: offer.current_price, originalPrice: offer.original_price, lowestPrice: offer.lowest_price, averagePrice: offer.average_price, historyCount: offer.price_history_count, title: offer.title, coupon: Boolean(offer.coupon_url), categoryMatch: true });
      const discount = offer.original_price > offer.current_price ? Math.round(((offer.original_price - offer.current_price) / offer.original_price) * 100) : 0;
      const matchedRules = rules.filter(rule => {
        if (radar.score < Number(rule.min_score || 0)) return false;
        if (discount < Number(rule.min_discount || 0)) return false;
        if (rule.max_price && Number(offer.current_price) > Number(rule.max_price)) return false;
        if (rule.require_price_history && Number(offer.price_history_count || 0) < 3) return false;
        if (rule.category_id && String(rule.category_id) !== String(offer.category_id)) return false;
        return true;
      });
      if (matchedRules.length) matches.push({ offer_id: offer.id, title: offer.title, score: radar.score, radar: classifyRadarScore(radar.score), reasons: radar.reasons, rules: matchedRules.map(r => r.id) });
    }
    return res.json({ action: 'EVALUATE', matches: matches.slice(0, 50), evaluated: offers.length });
  }

  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nome da regra é obrigatório' });
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO autopilot_rules (id, account_id, name, category_id, min_score, min_discount, max_price, max_publications_per_day, cooldown_minutes, require_price_history, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id, accountId, name, body.category_id || null, Number(body.min_score ?? 80), Number(body.min_discount ?? 10), body.max_price ? Number(body.max_price) : null, Number(body.max_publications_per_day ?? 20), Number(body.cooldown_minutes ?? 60), Boolean(body.require_price_history), body.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED']);
  return res.status(201).json({ id, message: 'Regra criada' });
}
