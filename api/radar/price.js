import crypto from 'node:crypto';
import { db } from 'hatchable';

export const access = 'member';

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
  const price = Math.round(Number(b.price) || 0);
  const original = b.original_price == null && b.originalPrice == null ? null : Math.round(Number(b.original_price ?? b.originalPrice) || 0);
  if (!offerId || price <= 0) return res.status(400).json({ error: 'Oferta e preço válido são obrigatórios.' });

  const offer = (await db.query('SELECT id,current_price,original_price FROM offers WHERE id=$1 AND account_id=$2 LIMIT 1', [offerId, aid])).rows[0];
  if (!offer) return res.status(404).json({ error: 'Oferta não encontrada.' });
  await db.query('INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price) VALUES($1,$2,$3,$4,$5)', [crypto.randomUUID(), aid, offerId, price, original]);
  const stats = (await db.query('SELECT MIN(price) lowest, MAX(price) highest, ROUND(AVG(price)) average, COUNT(*)::int count FROM offer_price_history WHERE account_id=$1 AND offer_id=$2', [aid, offerId])).rows[0];
  await db.query('UPDATE offers SET price_first_seen=COALESCE(price_first_seen,$1), price_lowest=$1, price_highest=$2, price_average=$3, price_history_count=$4, current_price=$1, original_price=COALESCE($5,original_price), radar_updated_at=now() WHERE id=$6 AND account_id=$7', [Number(stats.lowest), Number(stats.highest), Number(stats.average), Number(stats.count), original, offerId, aid]);
  return res.status(201).json({ offerId, history: stats });
}