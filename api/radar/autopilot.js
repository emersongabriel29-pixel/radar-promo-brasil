import { db } from 'hatchable';
import { evaluateMatches, enqueueMatches } from 'lib/autopilot.js';
import { classifyRadarScore } from 'lib/radar.js';
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
    return res.json({ action, evaluated: result.evaluated, matches: result.matches.map(item => ({ offer_id: item.offer.id, title: item.offer.title, score: item.radar.score, radar: classifyRadarScore(item.radar.score), reasons: item.radar.reasons, rules: item.matchedRules.map(r => r.id) })) });
  }
  if (action === 'PUBLISH') return res.json({ action, ...await enqueueMatches(account.id, String(b.offer_id || b.offerId || '').trim()) });
  if (action && action !== 'CREATE') return res.status(400).json({ error: 'Ação inválida.' });
  const name = String(b.name || '').trim().slice(0, 120), categoryId = b.category_id || b.categoryId || null;
  const minScore=Number(b.min_score??85), minDiscount=Number(b.min_discount??15), maxDaily=Number(b.max_publications_per_day??5), cooldown=Number(b.cooldown_minutes??120), maxPrice=moneyCents(b.max_price,{optional:true,cents:true});
  if (!name || !Number.isInteger(minScore) || minScore<0 || minScore>100 || !Number.isInteger(minDiscount) || minDiscount<0 || minDiscount>100 || !Number.isInteger(maxDaily) || maxDaily<1 || maxDaily>500 || !Number.isInteger(cooldown) || cooldown<0 || cooldown>10080 || (maxPrice!==null&&(!Number.isSafeInteger(maxPrice)||maxPrice<=0))) return res.status(400).json({ error: 'Confira nome, limites, preço e intervalo da regra.' });
  if(categoryId && !(await db.query('SELECT id FROM categories WHERE id=$1 AND account_id=$2',[categoryId,account.id])).rows.length) return res.status(400).json({error:'Categoria não pertence à conta.'});
  const id=crypto.randomUUID();
  await db.query('INSERT INTO autopilot_rules(id,account_id,name,category_id,min_score,min_discount,max_price,max_publications_per_day,cooldown_minutes,require_price_history,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,account.id,name,categoryId,minScore,minDiscount,maxPrice,maxDaily,cooldown,booleanValue(b.require_price_history),b.status==='ACTIVE'?'ACTIVE':'PAUSED']);
  return res.status(201).json({ id, message: 'Regra criada' });
}
