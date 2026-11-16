import { db } from 'lib/supabase-db.js';

export const access = 'admin';
export const methods = ['GET'];

export default async function handler(req, res) {
  try {
    const result = await db.query(
      "SELECT current_database() AS database, current_setting('server_version') AS server_version, now() AS checked_at"
    );
    const row = result.rows?.[0];
    if (result.rowCount !== 1 || result.rows?.length !== 1 ||
        typeof row?.database !== 'string' || !row.database.trim() ||
        typeof row?.server_version !== 'string' || !row.server_version.trim() ||
        typeof row?.checked_at !== 'string' || !Number.isFinite(Date.parse(row.checked_at))) {
      throw Object.assign(new Error('A consulta de saúde não retornou os dados esperados.'), {
        code: 'SUPABASE_HEALTH_INVALID_RESULT', status: 502
      });
    }
    return res.json({
      ok: true,
      provider: 'SUPABASE',
      database: row.database,
      serverVersion: row.server_version,
      checkedAt: row.checked_at
    });
  } catch (error) {
    return res.status(error?.status || 503).json({
      ok: false,
      provider: 'SUPABASE',
      code: String(error?.code || 'SUPABASE_BRIDGE_ERROR'),
      requestId: error?.requestId || null,
      note: 'Teste administrativo; nenhum dado do Radar foi alterado.'
    });
  }
}
