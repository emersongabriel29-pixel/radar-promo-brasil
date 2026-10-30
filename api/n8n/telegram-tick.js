import { db, config, webhooks } from 'hatchable';
import { configuredBotToken, sendTelegramOffer } from 'lib/telegram.js';
import { eligiblePublication, claimPublication } from 'lib/delivery.js';
import { cacheOfferImage } from 'lib/offer-images.js';
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

export default async function(req, res) {
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
      stage = 'dry_run_queue_check';
      const available = await db.query(`SELECT count(*)::int AS total
        FROM publications p
        LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
        JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
        WHERE p.account_id=$1 AND p.status IN ('READY','RETRY')
          AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
          AND g.status='ACTIVE' AND g.platform='TELEGRAM'
          AND NULLIF(trim(g.external_id),'') IS NOT NULL
          AND (p.content_type='MESSAGE' OR p.image_storage_key IS NOT NULL OR o.image_storage_key IS NOT NULL
            OR lower(split_part(p.image_url, '?', 1)) LIKE ANY (ARRAY['%.jpg','%.jpeg','%.png','%.webp','%.gif','%.avif','%.bmp'])
            OR lower(p.image_url) LIKE 'https://cf.shopee.com.br/file/%')
          AND ${eligiblePublication}`, [accountId]);
      return res.json({ ok: true, dryRun: true, sideEffects: false, queuedAvailable: Number(available.rows[0]?.total || 0) });
    }

    stage = 'deduplicate_event';
    const event = await remember(eventKey, accountId);
    if (event.duplicate) return res.json({ ok: true, ...event.response, duplicateEvent: true });
    if (event.busy) return res.status(409).json({ error: 'Evento em processamento ou repetido.' });
    eventId = event.id;

    // Run account-scoped autopilot on each authenticated 10-minute tick so fresh offers do not wait for the hourly cron.
    // Dry runs remain read-only, and an autopilot error must not block already queued Telegram deliveries.
    let autopilot = null;
    if (body.dryRun !== true) {
      stage = 'enqueue_eligible_offers';
      try { autopilot = await enqueueMatches(accountId, ''); }
      catch (error) { console.error('n8n telegram tick autopilot', String(error?.code || error?.name || 'ERROR').slice(0, 60)); }
    }

    stage = 'load_publication_queue';
    const rows = (await db.query(`SELECT p.id,p.offer_id AS "offerId",p.content_type AS "contentType",p.account_id AS "accountId",p.message,COALESCE(p.image_url,o.image_url) AS "imageUrl",COALESCE(p.image_storage_key,o.image_storage_key) AS "imageStorageKey",p.attempts,o.affiliate_url AS "affiliateUrl",o.coupon_code AS "couponCode",o.coupon_url AS "couponUrl",g.external_id AS "groupExternalId" FROM publications p LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.account_id=$1 AND p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.platform='TELEGRAM' AND NULLIF(trim(g.external_id),'') IS NOT NULL AND (p.content_type='MESSAGE' OR p.image_storage_key IS NOT NULL OR o.image_storage_key IS NOT NULL OR lower(split_part(p.image_url, '?', 1)) LIKE ANY (ARRAY['%.jpg','%.jpeg','%.png','%.webp','%.gif','%.avif','%.bmp']) OR lower(p.image_url) LIKE 'https://cf.shopee.com.br/file/%') AND ${eligiblePublication} ORDER BY p.priority DESC,p.created_at LIMIT 1`, [accountId])).rows;
    // dryRun is handled before event persistence above; normal delivery continues here.
    let published = 0, failed = 0, unconfirmed = 0, processed = 0;
    stage = 'process_publications';
    for (const item of rows) {
      stage = 'claim_publication';
      if (!(await claimPublication(db, item.id, item.accountId))) continue;
      processed++;
      const connections = (await db.query("SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority,last_seen_at DESC NULLS LAST", [item.accountId])).rows;
      let sent = false, lastError = 'Nenhum bot ativo conectado.';
      for (const connection of connections) {
        let providerAccepted = false;
        try {
          const token = await configuredBotToken(connection.secretSlot, item.accountId);
          const effectiveAffiliate = String(item.affiliateUrl || '').trim();
          const baseMessage = String(item.message || '').replace(/https?:\/\/[^\s]+\/api\/r\/[0-9a-f-]+/gi, effectiveAffiliate);
          const couponUrl = String(item.couponUrl || '').trim();
          const trackedMessage = item.couponCode && couponUrl && !baseMessage.includes(couponUrl) ? baseMessage + String.fromCharCode(10, 10) + '🎟️ Resgate o cupom aqui: ' + couponUrl : baseMessage;
          const external = await sendTelegramOffer(token, { ...item, imageUrl: item.contentType === 'MESSAGE' ? null : await cacheOfferImage(item, db), message: trackedMessage, affiliateUrl: effectiveAffiliate });
          providerAccepted = true;
          await db.transaction([
            { sql: "UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,telegram_connection_id=$3,external_message_id=$4 WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'", params: [item.id, item.accountId, connection.id, String(external?.message_id || '')] },
            { sql: "UPDATE telegram_connections SET failure_count=0,last_seen_at=now(),status='ACTIVE',updated_at=now() WHERE id=$1 AND account_id=$2", params: [connection.id, item.accountId] }
          ]);
          sent = true; published++; break;
        } catch (error) {
          lastError = String(error?.message || error).slice(0, 500);
          if (providerAccepted || /timeout|timed out|ECONNRESET|socket hang up/i.test(lastError)) {
            await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Entrega incerta. Confira o Telegram antes de reenviar.' WHERE id=$1 AND account_id=$2", [item.id, item.accountId]);
            unconfirmed++; sent = true; break;
          }
          if (['MEDIA_IMAGE_NOT_FOUND','MEDIA_URL_INVALID','MEDIA_TYPE_UNSUPPORTED','MEDIA_SIZE_INVALID'].includes(error?.code)) {
            await db.query("UPDATE publications SET status='FAILED',error_message=$3,next_attempt_at=NULL,telegram_connection_id=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'", [item.id, item.accountId, lastError]);
            failed++; sent = true; break;
          }
          if (String(error?.code || '').startsWith('MEDIA_')) break;
          await db.query("UPDATE telegram_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END,updated_at=now() WHERE id=$1 AND account_id=$2", [connection.id, item.accountId]);
        }
      }
      if (!sent) {
        await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$3,next_attempt_at=now()+interval '15 minutes',telegram_connection_id=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'", [item.id, item.accountId, lastError]);
        failed++;
      }
    }
    const result = { ok: true, processed, published, failed, unconfirmed, queuedAvailable: rows.length };
    await db.query("UPDATE webhook_events SET status='PROCESSED',response=$2,item_count=$3,processed_at=now(),updated_at=now() WHERE id=$1", [eventId, JSON.stringify(result), published + failed + unconfirmed]);
    return res.json(result);
  } catch (error) {
    if (eventId) await db.query("UPDATE webhook_events SET status='FAILED',updated_at=now() WHERE id=$1 AND status='PROCESSING'", [eventId]);
    const correlationId = crypto.randomUUID();
    console.error('n8n/telegram-tick', correlationId, stage, error?.code || error?.name || 'Error', String(error?.message || '').slice(0, 240));
    return res.status(500).json({ error: 'Não foi possível processar a fila do Telegram.', correlationId });
  }
}