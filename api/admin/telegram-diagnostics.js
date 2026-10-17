import { db } from 'hatchable';
export const access = 'member';
export const methods = ['GET'];
export default async function(req, res) {
  if (!req.member?.id) return res.status(401).json({ error: 'Não autorizado.' });
  const accountId = (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1', [String(req.member.id)])).rows[0]?.id;
  if (!accountId) return res.status(412).json({ error: 'Conta não encontrada para o membro autenticado.' });
  const checks = [];
  for (const [name, sql] of [
    ['account', "SELECT status FROM accounts WHERE id=$1"],
    ['publications', "SELECT status, count(*)::int AS count FROM publications WHERE account_id=$1 GROUP BY status"],
    ['telegram_connections', "SELECT status, count(*)::int AS count FROM telegram_connections WHERE account_id=$1 GROUP BY status"],
    ['telegram_groups', "SELECT count(*)::int AS count FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND platform='TELEGRAM' AND NULLIF(trim(external_id),'') IS NOT NULL"],
    ['recent_telegram_events', "SELECT status, count(*)::int AS count, max(created_at) AS latest FROM webhook_events WHERE provider='n8n' AND account_id=$1 AND action='telegram' AND created_at>now()-interval '24 hours' GROUP BY status ORDER BY status"]
  ]) {
    try { checks.push({ name, ok: true, rows: (await db.query(sql, [accountId])).rows }); }
    catch (e) { checks.push({ name, ok: false, error: { name: e?.name || 'Error', code: e?.code || null, message: String(e?.message || e).slice(0, 200) } }); }
  }
  return res.json({ readOnly: true, checks });
}