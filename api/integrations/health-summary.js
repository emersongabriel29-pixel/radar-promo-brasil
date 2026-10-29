import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET'];

export default async function(req, res) {
  if (!req.member) return res.status(401).json({error:'Entre no Radar para consultar o monitoramento.'});
  try {
    const rows = (await db.query(
      "SELECT name,status,details,last_checked_at AS \"lastCheckedAt\" FROM integration_health WHERE name IN ('n8n_api_rest','n8n_mcp') ORDER BY name"
    )).rows;
    return res.json({items:rows, interval:'hourly', alert:rows.some(x => x.status === 'ERROR')});
  } catch {
    return res.status(500).json({error:'Não foi possível consultar o último monitoramento automático.'});
  }
}