import { config, db, scheduler } from 'hatchable';

export const access = 'public';
export const methods = ['GET', 'POST'];

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const SUPPORTED_TOPICS = new Set(['items', 'items_prices']);
const dateOrNull = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function supportedResource(resource, topic) {
  const raw = String(resource || '').trim();
  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'api.mercadolibre.com') return false;
      pathname = url.pathname;
    } catch { return false; }
  }
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0].toLowerCase() === 'items') return /^MLB\d+$/i.test(parts[1]);
  return String(topic || '').toLowerCase() === 'items_prices'
    && parts.length === 3
    && parts[0].toLowerCase() === 'items'
    && /^MLB\d+$/i.test(parts[1])
    && parts[2].toLowerCase() === 'prices';
}

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function normalize(input, applicationId) {
  const topic = clean(input?.topic, 80);
  const resource = clean(input?.resource, 500);
  const userId = clean(input?.user_id ?? input?.userId, 80);
  const incomingAppId = clean(input?.application_id ?? input?.applicationId, 80);
  if (!topic || !resource || !userId || !incomingAppId) {
    throw Object.assign(new Error('Notificação sem topic, resource, user_id ou application_id.'), { status: 400 });
  }
  if (incomingAppId !== applicationId) {
    throw Object.assign(new Error('application_id não corresponde à aplicação configurada.'), { status: 403 });
  }
  if (!SUPPORTED_TOPICS.has(topic.toLowerCase()) || !supportedResource(resource, topic)) {
    throw Object.assign(new Error('Tópico ou recurso não suportado pelo processador do Radar Promo Brasil.'), { status: 400 });
  }
  const rawActions = Array.isArray(input?.actions) ? input.actions : [];
  const actions = rawActions.slice(0, 20).map(value => clean(value, 80)).filter(Boolean);
  const providerId = clean(input?._id ?? input?.id, 200);
  const sentAt = dateOrNull(input?.sent);
  const receivedAt = dateOrNull(input?.received ?? input?.recieved);
  const attempts = Number.isFinite(Number(input?.attempts))
    ? Math.max(1, Math.min(1000, Math.floor(Number(input.attempts))))
    : 1;
  return {
    topic,
    resource,
    userId,
    applicationId: incomingAppId,
    providerId,
    sentAt,
    receivedAt,
    attempts,
    actions,
    payload: {
      topic,
      resource,
      user_id: userId,
      application_id: incomingAppId,
      ...(providerId ? { notification_id: providerId } : {}),
      attempts,
      ...(sentAt ? { sent: sentAt } : {}),
      ...(receivedAt ? { received: receivedAt } : {}),
      ...(actions.length ? { actions } : {})
    }
  };
}

export default async function(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'mercadolivre-notifications',
      accepts: ['POST'],
      ready: Boolean(String(await config.get('MELI_APP_ID') || '').trim())
    });
  }

  try {
    const applicationId = clean(await config.get('MELI_APP_ID'), 80);
    if (!applicationId) {
      return res.status(503).json({ ok: false, error: 'MELI_APP_ID não configurado.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const inputs = Array.isArray(body.messages) ? body.messages.slice(0, 10) : [body];
    if (!inputs.length || inputs.length > 10) {
      return res.status(400).json({ ok: false, error: 'Lote de notificações inválido.' });
    }

    const prepared = [];
    for (const input of inputs) {
      const event = normalize(input, applicationId);
      const eventIdentity = event.providerId
        ? 'id:' + event.providerId
        : ['fallback', event.topic, event.userId, event.resource, event.sentAt || '', event.actions.join(',')].join(':');
      event.notificationKey = await digest(applicationId + ':' + eventIdentity);
      prepared.push(event);
    }

    // Resolve account ownership from the OAuth connection; no access tokens are read or logged here.
    const results = await Promise.all(prepared.map(async event => {
      const connection = (await db.query(
        "SELECT account_id FROM marketplace_connections WHERE marketplace='MERCADOLIVRE' AND external_user_id=$1 AND status='ACTIVE' ORDER BY updated_at DESC LIMIT 1",
        [event.userId]
      )).rows[0];
      const accountId = connection?.account_id || null;
      const status = accountId ? 'RECEIVED' : 'IGNORED';
      await db.query(
        `INSERT INTO meli_notification_events
          (notification_key, account_id, external_user_id, application_id, topic, resource, actions, attempts, sent_at, provider_received_at, payload, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::jsonb,$12)
         ON CONFLICT (notification_key) DO UPDATE SET
           attempts=GREATEST(meli_notification_events.attempts, EXCLUDED.attempts),
           last_received_at=now(),
           updated_at=now()`,
        [
          event.notificationKey, accountId, event.userId, event.applicationId, event.topic,
          event.resource, JSON.stringify(event.actions), event.attempts, event.sentAt,
          event.receivedAt, JSON.stringify(event.payload), status
        ]
      );
      return { accepted: Boolean(accountId), duplicateSafe: true };
    }));

    // Schedule downstream work only after durable persistence. Scheduling failures do not discard the event;
    // the hourly recovery job can pick it up later.
    if (results.some(item => item.accepted)) {
      const dispatch = await db.query(
        "INSERT INTO meli_notification_dispatch_state(id,last_scheduled_at) VALUES('worker',now()) ON CONFLICT(id) DO UPDATE SET last_scheduled_at=now() WHERE meli_notification_dispatch_state.last_scheduled_at < now()-interval '15 minutes' RETURNING id"
      );
      if (dispatch.rows.length) {
        try { await scheduler.now('/api/jobs/mercadolivre-notifications'); }
        catch (scheduleError) { console.error('meli notification scheduling failed', String(scheduleError?.code || scheduleError?.name || 'ERROR').slice(0, 60)); }
      }
    }

    return res.status(200).json({
      ok: true,
      received: results.length,
      queued: results.filter(item => item.accepted).length,
      ignored: results.filter(item => !item.accepted).length
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error('meli/notifications', String(error?.code || error?.name || 'ERROR').slice(0, 60));
    return res.status(status).json({
      ok: false,
      error: status === 500 ? 'Não foi possível registrar a notificação.' : clean(error?.message, 200)
    });
  }
}
