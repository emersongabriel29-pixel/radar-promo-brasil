import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET'];

export default async function (req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para continuar.' });
  const account = (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(req.member.id)])).rows[0];
  if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
  const rows = (await db.query("SELECT name,status,details,last_checked_at AS \"lastCheckedAt\" FROM account_integration_health WHERE account_id=$1 AND name IN ('n8n_api','n8n_mcp') ORDER BY name", [account.id])).rows;
  const items = rows.map(r => ({ name: r.name, status: r.status, details: r.details, lastCheckedAt: r.lastCheckedAt ? new Date(r.lastCheckedAt).toLocaleString('pt-BR') : null }));
  return res.json({ items, alert: items.some(x => x.status === 'ERROR') });
}
