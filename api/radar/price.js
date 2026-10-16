import crypto from 'node:crypto';
import { db } from 'hatchable';
import { moneyCents } from 'lib/validation.js';
// Manual observations do not update promotional copy or authorize publication.
export const access = 'member';
export const methods = ['GET','POST'];
async function accountId(member) {
  const r = await db.query('SELECT id FROM accounts WHERE owner_member_id=$1 LIMIT 1', [String(member?.id || '')]);
  return String(r.rows?.[0]?.id || '');
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Não autorizado.' });
  const aid = await accountId(req.member);
  if (!aid) return res.status(401).json({ error: 'Conta não identificada.' });
  if (req.method === 'GET') {
    const offerId = String(req.query?.offerId || '').trim();
    if (!offerId) return res.status(400).json({ error: 'offerId é obrigatório.' });
    const r = await db.query('SELECT price, original_price, captured_at, source_type, source_reference, verified_at FROM offer_price_history WHERE account_id=$1 AND offer_id=$2 ORDER BY captured_at DESC LIMIT 180', [aid, offerId]);
    return res.json({ history: r.rows || [] });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const b = req.body || {};
  const offerId = String(b.offer_id || b.offerId || '').trim();
  const price = moneyCents(b.price,{cents:true});
  const original = moneyCents(b.original_price ?? b.originalPrice,{cents:true,optional:true});
  if (!offerId || !Number.isSafeInteger(price) || price <= 0 || (original!==null&&!Number.isSafeInteger(original))) return res.status(400).json({ error: 'Oferta e preço válido em centavos são obrigatórios.' });
  const offer = (await db.query('SELECT * FROM offers WHERE id=$1 AND account_id=$2 LIMIT 1', [offerId, aid])).rows[0];
  if (!offer) return res.status(404).json({ error: 'Oferta não encontrada.' });
  // Member-submitted prices are observations only. They must never overwrite the offer price,
  // recompute a discount, or alter queued publication copy without a trusted official-source check.
  await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'UNVERIFIED',NULL,NULL)", [crypto.randomUUID(),aid,offerId,price,original]);
  const stats = (await db.query("SELECT MIN(price) lowest, MAX(price) highest, ROUND(AVG(price)) average, COUNT(*)::int count, COUNT(*) FILTER (WHERE source_type='OFFICIAL_API' AND verified_at IS NOT NULL)::int verified_count FROM offer_price_history WHERE account_id=$1 AND offer_id=$2", [aid, offerId])).rows[0];
  return res.status(202).json({ offerId, status:'UNVERIFIED', message:'Observação registrada, mas não foi usada para atualizar a oferta nem autorizar publicação. É necessária confirmação por fonte oficial.', history: stats });
}
