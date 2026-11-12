import { db, getDbProvider } from 'lib/radar-db.js';

export const access = 'admin';
export const methods = ['GET'];

export default async function handler(req, res) {
  try {
    const provider = await getDbProvider();
    const result = await db.query('SELECT 1 AS database_adapter_ok');
    return res.json({
      ok: result.rows?.[0]?.database_adapter_ok === 1,
      provider,
      rowCount: result.rowCount ?? 0
    });
  } catch (error) {
    return res.status(error?.status || 503).json({
      ok: false,
      provider: 'UNKNOWN',
      code: String(error?.code || 'DATABASE_ADAPTER_ERROR')
    });
  }
}
