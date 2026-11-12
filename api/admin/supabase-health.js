import { db } from 'lib/supabase-db.js';

export const access = 'admin';
export const methods = ['GET'];

export default async function handler(req, res) {
  try {
    const result = await db.query(
      "SELECT current_database() AS database, current_setting('server_version') AS server_version, now() AS checked_at"
    );
    return res.json({
      ok: true,
      provider: 'SUPABASE',
      database: result.rows?.[0]?.database || null,
      serverVersion: result.rows?.[0]?.server_version || null,
      checkedAt: result.rows?.[0]?.checked_at || null
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