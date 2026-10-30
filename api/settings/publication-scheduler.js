import { db, scheduler } from 'hatchable';
import { getOrCreateAccount } from 'lib/accounts.js';

export const access = 'member';
export const methods = ['GET', 'PUT'];

const cleanSource = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_:-]/g, '').slice(0, 60);
const clampInt = (value, fallback, min, max) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

async function discoverSources(accountId) {
  const rows = (await db.query(`
    SELECT upper(source) AS source FROM offers
    WHERE account_id=$1 AND NULLIF(trim(source),'') IS NOT NULL
    UNION
    SELECT upper(marketplace) AS source FROM marketplace_api_credentials
    WHERE account_id=$1 AND status IN ('ACTIVE','VALIDATED')
  `, [accountId])).rows;
  return [...new Set(rows.map(row => cleanSource(row.source)).filter(Boolean))].sort();
}

export default async function handler(req, res) {
  if (!req.member?.id) return res.status(401).json({ error: 'Entre para configurar o escalonador.' });
  try {
    const account = await getOrCreateAccount(req.member);
    await db.query('INSERT INTO publication_scheduler_settings(account_id) VALUES($1) ON CONFLICT(account_id) DO NOTHING', [account.id]);
    let row = (await db.query('SELECT * FROM publication_scheduler_settings WHERE account_id=$1', [account.id])).rows[0];
    const discovered = await discoverSources(account.id);
    const savedOrder = Array.isArray(row.source_order) ? row.source_order.map(cleanSource).filter(Boolean) : ['SHOPEE','ALIEXPRESS','LOMADEE'];
    const sourceOrder = [...savedOrder, ...discovered.filter(source => !savedOrder.includes(source))];
    if (sourceOrder.length !== savedOrder.length) {
      await db.query('UPDATE publication_scheduler_settings SET source_order=$2::jsonb,updated_at=now() WHERE account_id=$1', [account.id, JSON.stringify(sourceOrder)]);
      row = (await db.query('SELECT * FROM publication_scheduler_settings WHERE account_id=$1', [account.id])).rows[0];
    }

    if (req.method === 'GET') {
      const config = row.source_config && typeof row.source_config === 'object' ? row.source_config : {};
      const sources = sourceOrder.map((source, index) => {
        const item = config[source] && typeof config[source] === 'object' ? config[source] : {};
        return {
          source,
          enabled: item.enabled !== false,
          batchSize: clampInt(item.batchSize, Number(row.batch_size) || 20, 1, 100),
          intervalMinutes: item.intervalMinutes == null ? null : clampInt(item.intervalMinutes, Number(row.interval_minutes) || 10, 1, 1440),
          order: index + 1,
          discovered: discovered.includes(source)
        };
      });
      return res.json({
        settings: {
          enabled: row.enabled !== false,
          intervalMinutes: Number(row.interval_minutes) || 10,
          batchSize: Number(row.batch_size) || 20,
          sourceOrder,
          lastSource: row.last_source || null,
          lastRunAt: row.last_run_at || null,
          nextTurnAt: row.next_turn_at || null,
          lastResult: row.last_result || {}
        },
        sources,
        discovery: { automatic: true, discoveredSources: discovered }
      });
    }

    const body = req.body || {};
    const enabled = body.enabled !== false;
    const intervalMinutes = clampInt(body.intervalMinutes, Number(row.interval_minutes) || 10, 1, 1440);
    const batchSize = clampInt(body.batchSize, Number(row.batch_size) || 20, 1, 100);
    const allowed = new Set([...sourceOrder, ...discovered]);
    const requestedOrder = Array.isArray(body.sourceOrder) ? body.sourceOrder.map(cleanSource).filter((source, index, arr) => source && arr.indexOf(source) === index && allowed.has(source)) : sourceOrder;
    const finalOrder = [...requestedOrder, ...sourceOrder.filter(source => !requestedOrder.includes(source))];
    const incoming = body.sourceConfig && typeof body.sourceConfig === 'object' ? body.sourceConfig : {};
    const sourceConfig = {};
    for (const source of finalOrder) {
      const item = incoming[source] && typeof incoming[source] === 'object' ? incoming[source] : {};
      sourceConfig[source] = {
        enabled: item.enabled !== false,
        batchSize: clampInt(item.batchSize, batchSize, 1, 100),
        intervalMinutes: item.intervalMinutes == null || item.intervalMinutes === '' ? null : clampInt(item.intervalMinutes, intervalMinutes, 1, 1440)
      };
    }
    await db.query(`
      UPDATE publication_scheduler_settings
      SET enabled=$2,interval_minutes=$3,batch_size=$4,source_order=$5::jsonb,
          source_config=$6::jsonb,
          next_turn_at=CASE WHEN last_run_at IS NULL THEN now() ELSE GREATEST(now(),last_run_at+($3::text||' minutes')::interval) END,
          updated_at=now()
      WHERE account_id=$1
    `, [account.id, enabled, intervalMinutes, batchSize, JSON.stringify(finalOrder), JSON.stringify(sourceConfig)]);
    if(enabled){
      try {
        const next=(await db.query("SELECT MIN(next_turn_at) AS next_at FROM publication_scheduler_settings WHERE enabled=true")).rows[0]?.next_at;
        if(next)await scheduler.at(new Date(Math.max(Date.now()+1000,new Date(next).getTime())),'/api/jobs/telegram',{name:'publication-scheduler-master'});
      } catch (error) { console.error('publication scheduler wake failed', String(error?.code || error?.name || 'ERROR').slice(0, 60)); }
    }
    return res.json({ ok: true, settings: { enabled, intervalMinutes, batchSize, sourceOrder: finalOrder }, sources: sourceConfig });
  } catch (error) {
    console.error('publication scheduler settings', String(error?.code || error?.name || 'ERROR').slice(0, 80));
    return res.status(500).json({ error: 'Não foi possível salvar as configurações do escalonador.' });
  }
}