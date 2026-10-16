import { db } from 'hatchable';
import { evaluateMatches, enqueueMatches } from 'lib/autopilot.js';
import { calculateRadarScore, classifyRadarScore } from 'lib/radar.js';
import { booleanValue, moneyCents } from 'lib/validation.js';
export const access = 'member';
export const methods = ['GET', 'POST'];

export default async function(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para continuar.' });
  const account = (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1', [String(req.member.id)])).rows[0];
  if (!account) return res.status(412).json({ error: 'Abra o painel para inicializar a conta.' });
  if (req.method === 'GET') return res.json({ rules: (await db.query('SELECT * FROM autopilot_rules WHERE account_id=$1 ORDER BY updated_at DESC', [account.id])).rows });
  const b = req.body || {}, action = String(b.action || '').toUpperCase();
  if (action === 'EVALUATE') {
    const result = await evaluateMatches(account.id);
    const offers = (await db.query("SELECT * FROM offers WHERE account_id=$1 AND status='APPROVED' ORDER BY created_at DESC LIMIT 100", [account.id])).rows;
    const diagnostics = offers.map(offer => {
      const radar = calculateRadarScore({ currentPrice: offer.current_price, originalPrice: offer.original_price, lowestPrice: offer.price_lowest, averagePrice: offer.price_average, historyCount: offer.price_history_count, title: offer.title, coupon: Boolean(offer.coupon_code || offer.coupon_url) });
      const discount = offer.original_price > offer.current_price ? Math.round((offer.original_price - offer.current_price) * 100 / offer.original_price) : 0;
      const applicable = result.rules.filter(rule => !rule.category_id || rule.category_id === offer.category_id);
      const checks = applicable.map(rule => ({
        rule_id: rule.id,
        rule_name: rule.name,
        min_score: rule.min_score,
        score_informational: true,
        score_gate_enabled: false,
        min_discount: rule.min_discount,
        min_discount_applied: null,
        score_pass: null,
        discount_pass: true,
        price_pass: !rule.max_price || offer.current_price <= rule.max_price,
        history_pass: !rule.require_price_history || offer.price_history_count >= 3,
        category_pass: !rule.category_id || rule.category_id === offer.category_id,
        matched: (!rule.max_price || offer.current_price <= rule.max_price) && (!rule.require_price_history || offer.price_history_count >= 3) && (!rule.category_id || rule.category_id === offer.category_id)
      }));
      return { offer_id: offer.id, title: offer.title, source: offer.source, current_price: offer.current_price, original_price: offer.original_price, discount, score: radar.score, radar: classifyRadarScore(radar.score), reasons: radar.reasons, checks, matched: checks.some(check => check.matched) };
    });
    const summary = {
      total: diagnostics.length,
      matched: diagnostics.filter(item => item.matched).length,
      score_is_informational: true,
      rejected_score: 0,
      rejected_discount: diagnostics.filter(item => item.checks.length && !item.checks.some(check => check.discount_pass)).length,
      no_applicable_rule: diagnostics.filter(item => !item.checks.length).length
    };
    return res.json({ action, evaluated: result.evaluated, scorePolicy: 'INFORMATIONAL_ONLY', summary, diagnostics, matches: result.matches.map(item => ({ offer_id: item.offer.id, title: item.offer.title, score: item.radar.score, radar: classifyRadarScore(item.radar.score), reasons: item.radar.reasons, rules: item.matchedRules.map(r => r.id) })) });
  }
  if (action === 'PUBLISH') return res.json({ action, ...await enqueueMatches(account.id, String(b.offer_id || b.offerId || '').trim()) });
  if (action && action !== 'CREATE') return res.status(400).json({ error: 'Ação inválida.' });
  const name = String(b.name || '').trim().slice(0, 120), categoryId = b.category_id || b.categoryId || null;
  const minScore=Number(b.min_score??85), minDiscount=Number(b.min_discount??15), maxDaily=Number(b.max_publications_per_day??2147483647), cooldown=Number(b.cooldown_minutes??0), maxPrice=moneyCents(b.max_price,{optional:true,cents:true});
  if (!name || !Number.isInteger(minScore) || minScore<0 || minScore>100 || !Number.isInteger(minDiscount) || minDiscount<0 || minDiscount>100 || !Number.isSafeInteger(maxDaily) || maxDaily<1 || !Number.isInteger(cooldown) || cooldown<0 || cooldown>10080 || (maxPrice!==null&&(!Number.isSafeInteger(maxPrice)||maxPrice<=0))) return res.status(400).json({ error: 'Confira nome, limites, preço e intervalo da regra.' });
  if(categoryId && !(await db.query('SELECT id FROM categories WHERE id=$1 AND account_id=$2',[categoryId,account.id])).rows.length) return res.status(400).json({error:'Categoria não pertence à conta.'});
  const id=crypto.randomUUID();
  await db.query('INSERT INTO autopilot_rules(id,account_id,name,category_id,min_score,min_discount,max_price,max_publications_per_day,cooldown_minutes,require_price_history,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,account.id,name,categoryId,minScore,minDiscount,maxPrice,maxDaily,cooldown,booleanValue(b.require_price_history),b.status==='ACTIVE'?'ACTIVE':'PAUSED']);
  return res.status(201).json({ id, message: 'Regra criada' });
}
