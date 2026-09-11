import crypto from 'node:crypto';
import { db } from 'hatchable';
import { calculateRadarScore, classifyRadarScore } from '../../lib/radar.js';
import { message } from '../../lib/automation.js';

export const access = 'member';

async function getAccountId(member) {
  const memberId = String(member?.id || '').trim();
  if (!memberId) return '';
  const result = await db.query('SELECT id FROM accounts WHERE owner_member_id = $1 LIMIT 1', [memberId]);
  return String(result.rows?.[0]?.id || '');
}

function evaluateOffer(offer, rules) {
  const radar = calculateRadarScore({
    currentPrice: offer.current_price,
    originalPrice: offer.original_price,
    lowestPrice: offer.lowest_price,
    averagePrice: offer.average_price,
    historyCount: offer.price_history_count,
    title: offer.title,
    coupon: Boolean(offer.coupon_url),
    categoryMatch: true
  });
  const discount = offer.original_price > offer.current_price
    ? Math.round(((offer.original_price - offer.current_price) / offer.original_price) * 100)
    : 0;
  const matchedRules = rules.filter(rule => {
    if (radar.score < Number(rule.min_score || 0)) return false;
    if (discount < Number(rule.min_discount || 0)) return false;
    if (rule.max_price && Number(offer.current_price) > Number(rule.max_price)) return false;
    if (rule.require_price_history && Number(offer.price_history_count || 0) < 3) return false;
    if (rule.category_id && String(rule.category_id) !== String(offer.category_id)) return false;
    return true;
  });
  return { radar, discount, matchedRules };
}

async function getMatches(accountId) {
  const rules = (await db.query(`SELECT * FROM autopilot_rules WHERE account_id = $1 AND status = 'ACTIVE' ORDER BY min_score DESC, updated_at DESC`, [accountId])).rows || [];
  const offers = (await db.query(`SELECT o.*, COALESCE(o.price_lowest, 0) AS lowest_price, COALESCE(o.price_average, 0) AS average_price FROM offers o WHERE o.account_id = $1 AND COALESCE(o.status, 'READY') IN ('READY','APPROVED','PENDING') ORDER BY COALESCE(o.radar_score,35) DESC, o.created_at DESC LIMIT 100`, [accountId])).rows || [];
  const matches = [];
  for (const offer of offers) {
    const result = evaluateOffer(offer, rules);
    if (!result.matchedRules.length) continue;
    await db.query(`UPDATE offers SET radar_score=$1, radar_reasons=$2, radar_updated_at=now() WHERE id=$3 AND account_id=$4`, [result.radar.score, result.radar.reasons.join(' • '), offer.id, accountId]);
    matches.push({ offer, ...result });
  }
  return { rules, matches };
}

async function publishMatches(accountId, requestedOfferId = '') {
  const { rules, matches } = await getMatches(accountId);
  const selected = requestedOfferId ? matches.filter(x => String(x.offer.id) === requestedOfferId) : matches;
  let published = 0;
  const results = [];

  for (const item of selected) {
    const rule = item.matchedRules.sort((a, b) => Number(b.min_score || 0) - Number(a.min_score || 0))[0];
    const daily = Number((await db.query(`SELECT COUNT(*)::int AS count FROM publications WHERE account_id=$1 AND created_at>=date_trunc('day',now()) AND offer_id=$2`, [accountId, item.offer.id])).rows[0]?.count || 0);
    if (daily > 0) {
      results.push({ offer_id: item.offer.id, status: 'SKIPPED', reason: 'Oferta já possui publicação hoje' });
      continue;
    }

    const cooldown = Math.max(0, Number(rule?.cooldown_minutes || 0));
    if (cooldown > 0) {
      const recent = (await db.query(`SELECT created_at FROM publications WHERE account_id=$1 AND offer_id=$2 ORDER BY created_at DESC LIMIT 1`, [accountId, item.offer.id])).rows[0];
      if (recent?.created_at) {
        const lastMs = new Date(recent.created_at).getTime();
        const elapsed = (Date.now() - lastMs) / 60000;
        if (Number.isFinite(elapsed) && elapsed < cooldown) {
          results.push({ offer_id: item.offer.id, status: 'COOLDOWN', reason: `Aguardando ${Math.ceil(cooldown - elapsed)} min antes de publicar novamente` });
          continue;
        }
      }
    }

    const groups = (await db.query(`SELECT id,name,platform,category_id,external_id FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND (category_id=$2 OR category_id IS NULL) ORDER BY CASE WHEN category_id=$2 THEN 0 ELSE 1 END,name`, [accountId, item.offer.category_id])).rows || [];
    if (!groups.length) {
      results.push({ offer_id: item.offer.id, status: 'SKIPPED', reason: 'Nenhum grupo ativo compatível' });
      continue;
    }

    const maxDaily = Math.max(1, Number(rule?.max_publications_per_day || 20));
    const todayCount = Number((await db.query(`SELECT COUNT(*)::int AS count FROM publications WHERE account_id=$1 AND created_at>=date_trunc('day',now())`, [accountId])).rows[0]?.count || 0);
    if (todayCount >= maxDaily) {
      results.push({ offer_id: item.offer.id, status: 'LIMIT', reason: `Limite diário de ${maxDaily} publicações atingido` });
      continue;
    }

    const targets = groups.slice(0, Math.max(1, Math.min(groups.length, Number(item.offer.max_publications || groups.length))));
    const text = message(item.offer);
    for (const group of targets) {
      const idempotency = `radar:${item.offer.id}:${group.id}`;
      const exists = (await db.query(`SELECT id FROM publications WHERE account_id=$1 AND idempotency_key=$2 LIMIT 1`, [accountId, idempotency])).rows[0];
      if (exists) continue;
      await db.query(`INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url,mode,priority,idempotency_key) VALUES($1,$2,$3,$4,'READY',$5,$6,'SMART',$7,$8)`, [crypto.randomUUID(), accountId, item.offer.id, group.id, text, item.offer.image_url, Math.min(100, item.radar.score), idempotency]);
      published++;
    }
    results.push({ offer_id: item.offer.id, status: 'PUBLISHED_TO_QUEUE', score: item.radar.score, groups: targets.map(g => g.id), reasons: item.radar.reasons });
  }
  return { published, evaluated: matches.length, results };
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Não autorizado.' });
  const accountId = await getAccountId(req.member);
  if (!accountId) return res.status(401).json({ error: 'Conta não identificada' });

  if (req.method === 'GET') {
    const result = await db.query(`SELECT * FROM autopilot_rules WHERE account_id = $1 ORDER BY updated_at DESC`, [accountId]);
    return res.json({ rules: result.rows || [] });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const body = req.body || {};
  const action = String(body.action || '').toUpperCase();

  if (action === 'EVALUATE') {
    const { matches } = await getMatches(accountId);
    return res.json({
      action: 'EVALUATE',
      matches: matches.slice(0, 50).map(item => ({
        offer_id: item.offer.id,
        title: item.offer.title,
        score: item.radar.score,
        radar: classifyRadarScore(item.radar.score),
        reasons: item.radar.reasons,
        rules: item.matchedRules.map(r => r.id)
      })),
      evaluated: matches.length
    });
  }

  if (action === 'PUBLISH') {
    const result = await publishMatches(accountId, String(body.offer_id || body.offerId || '').trim());
    return res.json({ action: 'PUBLISH', ...result });
  }

  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nome da regra é obrigatório' });
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO autopilot_rules (id, account_id, name, category_id, min_score, min_discount, max_price, max_publications_per_day, cooldown_minutes, require_price_history, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id, accountId, name, body.category_id || null, Number(body.min_score ?? 80), Number(body.min_discount ?? 10), body.max_price ? Number(body.max_price) : null, Number(body.max_publications_per_day ?? 20), Number(body.cooldown_minutes ?? 60), Boolean(body.require_price_history), body.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED']);
  return res.status(201).json({ id, message: 'Regra criada' });
}