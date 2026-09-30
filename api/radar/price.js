import crypto from 'node:crypto';
import { db } from 'hatchable';
import { moneyCents } from 'lib/validation.js';
import { message } from 'lib/automation.js';

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
    const r = await db.query('SELECT price, original_price, captured_at FROM offer_price_history WHERE account_id=$1 AND offer_id=$2 ORDER BY captured_at DESC LIMIT 180', [aid, offerId]);
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
  const revisedMessage=message({...offer,current_price:price,original_price:original??offer.original_price});
  await db.transaction([
    {sql:'SELECT id FROM offers WHERE id=$1 AND account_id=$2 FOR UPDATE',params:[offerId,aid]},
    {sql:'INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price) VALUES($1,$2,$3,$4,$5)',params:[crypto.randomUUID(),aid,offerId,price,original]},
    {sql:`UPDATE offers SET price_first_seen=COALESCE(price_first_seen,current_price),current_price=$1,original_price=COALESCE($2,original_price),
      price_lowest=(SELECT min(price) FROM offer_price_history WHERE account_id=$4 AND offer_id=$3),
      price_highest=(SELECT max(price) FROM offer_price_history WHERE account_id=$4 AND offer_id=$3),
      price_average=(SELECT round(avg(price)) FROM offer_price_history WHERE account_id=$4 AND offer_id=$3),
      price_history_count=(SELECT count(*) FROM offer_price_history WHERE account_id=$4 AND offer_id=$3),
      discount_percent=CASE WHEN COALESCE($2,original_price)>$1 THEN round((COALESCE($2,original_price)-$1)*100.0/COALESCE($2,original_price)) ELSE 0 END,
      message=$5,updated_at=now(),radar_updated_at=now() WHERE id=$3 AND account_id=$4`,params:[price,original,offerId,aid,revisedMessage]},
    {sql:"UPDATE publications SET message=$3 WHERE offer_id=$1 AND account_id=$2 AND status IN ('READY','RETRY','SCHEDULED')",params:[offerId,aid,revisedMessage]}
  ]);
  const stats = (await db.query('SELECT MIN(price) lowest, MAX(price) highest, ROUND(AVG(price)) average, COUNT(*)::int count FROM offer_price_history WHERE account_id=$1 AND offer_id=$2', [aid, offerId])).rows[0];
  return res.status(201).json({ offerId, history: stats });
}
