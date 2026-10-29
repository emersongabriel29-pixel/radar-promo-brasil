import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET'];

export default async function(req, res) {
  if (!req.member) return res.status(401).json({error:'Entre no Radar para consultar o monitoramento.'});
  try {
    const account = (await db.query(
      "SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",
      [String(req.member.id)]
    )).rows[0];
    if (!account) return res.status(412).json({error:'Abra o painel do Radar para inicializar sua conta.'});
    const rows = (await db.query(
      "SELECT name,status,details,last_checked_at AS \"lastCheckedAt\" FROM account_integration_health WHERE account_id=$1 AND name IN ('n8n_api_rest','n8n_mcp') ORDER BY name",
      [account.id]
    )).rows;
    return res.json({items:rows, interval:'hourly', alert:rows.some(x => x.status === 'ERROR')});
  } catch {
    return res.status(500).json({error:'Não foi possível consultar o último monitoramento automático.'});
  }
}