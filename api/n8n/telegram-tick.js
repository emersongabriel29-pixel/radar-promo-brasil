import { db, config, webhooks } from 'hatchable';
import { enqueueMatches } from 'lib/autopilot.js';

export const access = 'public';
export const methods = ['POST'];

async function accountSecret(master, accountId) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(master), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(accountId));
  return Array.from(new Uint8Array(bytes)).map(x => x.toString(16).padStart(2, '0')).join('');
}
async function verify(req, accountId) {
  let master;
  try { master = await config.get('N8N_WEBHOOK_SECRET'); } catch { return null; }
  if (!master) return null;
  const secret = await accountSecret(master, accountId);
  const ts = String(req.headers['x-rpb-timestamp'] || '');
  const sig = String(req.headers['x-rpb-signature'] || '').replace(/^sha256=/, '');
  if (!ts || !sig) return false;
  return webhooks.verifyHmac({ raw: ts + '.' + req.rawBody, signature: sig, secret, algorithm: 'sha256', encoding: 'hex', timestamp: ts, tolerance: 300 });
}
async function remember(eventId, accountId) {
  const scopedKey = accountId + ':' + eventId;
  const r = await db.query(
    "INSERT INTO webhook_events(provider,event_key,action,account_id,status) VALUES($1,$2,$3,$4,'PROCESSING') ON CONFLICT(provider,event_key) DO UPDATE SET status='PROCESSING',updated_at=now() WHERE webhook_events.action=EXCLUDED.action AND (webhook_events.status='FAILED' OR (webhook_events.status IN ('PROCESSING','RECEIVED') AND webhook_events.updated_at<now()-interval '5 minutes')) RETURNING id",
    ['n8n', scopedKey, 'telegram', accountId]
  );
  if (r.rows[0]) return { id: r.rows[0].id };
  const old = (await db.query('SELECT status,response,action FROM webhook_events WHERE provider=$1 AND event_key=$2 AND account_id=$3', ['n8n', scopedKey, accountId])).rows[0];
  return old?.status === 'PROCESSED' && old.action === 'telegram' ? { duplicate: true, response: old.response || {} } : { busy: true };
}

export default async function handler(req, res) {
  let eventId;
  let stage = 'validate_request';
  try {
    const body = req.body || {};
    const accountId = String(body.accountId || '').slice(0, 100);
    const eventKey = String(body.eventId || '').slice(0, 160);
    if (!accountId || !eventKey || body.action !== 'telegram') return res.status(400).json({ error: 'accountId, eventId e action=telegram são obrigatórios.' });
    stage = 'verify_signature';
    const verified = await verify(req, accountId);
    if (verified === null) return res.status(503).json({ error: 'Ponte n8n aguardando configuração segura.' });
    if (!verified) return res.status(401).json({ error: 'Assinatura inválida ou expirada.' });
    stage = 'verify_account';
    if (!(await db.query("SELECT id FROM accounts WHERE id=$1 AND status='ACTIVE'", [accountId])).rows.length) return res.status(404).json({ error: 'Conta inválida.' });

    if (body.dryRun === true) {
      const available = await db.query(`
        SELECT count(*)::int AS total
        FROM publications p
        JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
        WHERE p.account_id=$1 AND p.status IN ('READY','RETRY')
          AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
          AND g.status='ACTIVE' AND g.platform='TELEGRAM'
          AND NULLIF(trim(g.external_id),'') IS NOT NULL
      `, [accountId]);
      return res.json({ ok: true, dryRun: true, sideEffects: false, queuedAvailable: Number(available.rows[0]?.total || 0), dispatcher: 'CENTRAL' });
    }

    stage = 'deduplicate_event';
    const event = await remember(eventKey, accountId);
    if (event.duplicate) return res.json({ ok: true, ...event.response, duplicateEvent: true });
    if (event.busy) return res.status(409).json({ error: 'Evento em processamento ou repetido.' });
    eventId = event.id;

    stage = 'enqueue_eligible_offers';
    const autopilot = await enqueueMatches(accountId, '');
    const response = { ok: true, delegatedToCentralScheduler: true, autopilot, delivery: 'CENTRAL_SCHEDULER' };
    await db.query("UPDATE webhook_events SET status='PROCESSED',response=$2,item_count=$3,processed_at=now(),updated_at=now() WHERE id=$1", [eventId, JSON.stringify(response), Number(autopilot?.telegramQueued || 0)]);
    return res.json(response);
  } catch (error) {
    if (eventId) await db.query("UPDATE webhook_events SET status='FAILED',updated_at=now() WHERE id=$1 AND status='PROCESSING'", [eventId]);
    const correlationId = crypto.randomUUID();
    console.error('n8n/telegram-tick', correlationId, stage, error?.code || error?.name || 'Error', String(error?.message || '').slice(0, 240));
    return res.status(500).json({ error: 'Não foi possível enfileirar as ofertas para o escalonador central.', correlationId });
  }
}