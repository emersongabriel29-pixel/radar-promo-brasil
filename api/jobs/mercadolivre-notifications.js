import { db, scheduler } from 'hatchable';
import { meliGet } from 'lib/direct-connectors.js';
import { message as buildMessage } from 'lib/automation.js';

export const access = 'scheduler';
export const methods = ['POST'];

const clean = (v, max = 300) => String(v ?? '').split(String.fromCharCode(13)).join(' ').split(String.fromCharCode(10)).join(' ').split(String.fromCharCode(9)).join(' ').trim().slice(0, max);
const cents = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value) * 100) : null;

function itemIdFromResource(resource) {
  const raw = String(resource || '').trim();
  let pathname = raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    let parsed;
    try { parsed = new URL(raw); } catch { return null; }
    if (parsed.hostname.toLowerCase() !== 'api.mercadolibre.com') return null;
    pathname = parsed.pathname;
  }
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'items') return null;
  const id = parts[1].replace(/-/g, '').toUpperCase();
  if (!id.startsWith('MLB') || !Number.isSafeInteger(Number(id.slice(3))) || !id.slice(3)) return null;
  return id;
}

function snapshotOf(item) {
  return {
    id: clean(item?.id, 40),
    title: clean(item?.title, 300),
    price: Number.isFinite(Number(item?.price)) ? Number(item.price) : null,
    original_price: Number.isFinite(Number(item?.original_price)) ? Number(item.original_price) : null,
    currency_id: clean(item?.currency_id, 12),
    available_quantity: Number.isFinite(Number(item?.available_quantity)) ? Number(item.available_quantity) : null,
    status: clean(item?.status, 40),
    permalink: clean(item?.permalink, 1000),
    thumbnail: clean(item?.secure_thumbnail || item?.thumbnail, 1000),
    last_updated: clean(item?.last_updated || item?.date_created, 60)
  };
}

async function processEvent(event) {
  // This app is an affiliate-offer radar: only item and item-price topics may change offer data.
  // All other subscribed topics are retained for audit but must never mutate offers through this handler.
  const supportedTopics = new Set(['items', 'items_prices']);
  if (!supportedTopics.has(String(event.topic || '').toLowerCase())) {
    await db.query(
      "UPDATE meli_notification_events SET status='UNSUPPORTED', last_error=$2, processed_at=now(), updated_at=now() WHERE id=$1",
      [event.id, 'Tópico recebido, mas ainda sem processador específico no Radar Promo Brasil: ' + clean(event.topic, 80)]
    );
    return { processed: 1, updatedOffers: 0, unsupported: 1, failed: 0 };
  }
  const itemId = itemIdFromResource(event.resource);
  if (!itemId) {
    await db.query(
      "UPDATE meli_notification_events SET status='UNSUPPORTED', last_error=$2, processed_at=now(), updated_at=now() WHERE id=$1",
      [event.id, 'Recurso não suportado pelo processador atual; evento preservado para auditoria.']
    );
    return { processed: 1, updatedOffers: 0, unsupported: 1, failed: 0 };
  }

  const response = await meliGet(event.account_id, '/items/' + encodeURIComponent(itemId));
  let item = response.body;
  if (response.status >= 200 && response.status < 300 && item?.id) {
    const priceResponse = await meliGet(event.account_id, '/items/' + encodeURIComponent(itemId) + '/prices');
    if (priceResponse.status >= 200 && priceResponse.status < 300 && Array.isArray(priceResponse.body?.prices)) {
      const marketplacePrice = priceResponse.body.prices.find(price =>
        Array.isArray(price?.conditions?.context_restrictions) && price.conditions.context_restrictions.includes('channel_marketplace')
      ) || priceResponse.body.prices[0];
      if (marketplacePrice && Number.isFinite(Number(marketplacePrice.amount))) {
        item = { ...item, price: Number(marketplacePrice.amount), original_price: marketplacePrice.regular_amount ?? item.original_price };
      }
    }
  }
  if (response.status < 200 || response.status >= 300 || !item?.id) {
    const status = response.status || 502;
    const permanent = status === 403 || status === 404;
    const nextStatus = permanent || Number(event.processing_attempts) >= 4 ? 'FAILED_FINAL' : 'FAILED';
    await db.query(
      'UPDATE meli_notification_events SET status=$2, last_error=$3, updated_at=now() WHERE id=$1',
      [event.id, nextStatus, 'Consulta do anúncio retornou HTTP ' + status + '.']
    );
    return { processed: 0, updatedOffers: 0, unsupported: 0, failed: 1 };
  }
  const snapshot = snapshotOf(item);
  const priceCents = cents(item.price);
  const originalCents = cents(item.original_price);
  let updatedOffers = 0;

  if (priceCents && item.status === 'active') {
    const matches = (await db.query(
      "SELECT id, account_id, title, current_price, original_price, message, affiliate_url, image_url FROM offers WHERE account_id=$1 AND position($2 in regexp_replace(upper(coalesce(product_url,'')), '[^A-Z0-9]', '', 'g')) > 0 LIMIT 20",
      [event.account_id, itemId]
    )).rows;

    for (const offer of matches) {
      const priceChanged = Number(offer.current_price) !== priceCents ||
        (originalCents !== null && Number(offer.original_price) !== originalCents);
      const titleChanged = Boolean(snapshot.title && snapshot.title !== offer.title);
      const imageChanged = Boolean(snapshot.thumbnail && snapshot.thumbnail !== offer.image_url);
      if (!priceChanged && !titleChanged && !imageChanged) continue;

      const revised = buildMessage({
        ...offer,
        title: snapshot.title || offer.title,
        current_price: priceCents,
        original_price: originalCents || offer.original_price
      });

      const operations = [];
      if (priceChanged) {
        operations.push({
          sql: 'INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price) VALUES($1,$2,$3,$4,$5)',
          params: [crypto.randomUUID(), event.account_id, offer.id, priceCents, originalCents]
        });
      }
      if (priceChanged) {
        operations.push({
          sql: "UPDATE offers SET title=COALESCE(NULLIF($1,''),title), current_price=$2, original_price=COALESCE($3,original_price), image_url=COALESCE(NULLIF($4,''),image_url), price_first_seen=COALESCE(price_first_seen,current_price), price_lowest=(SELECT min(price) FROM offer_price_history WHERE account_id=$5 AND offer_id=$6), price_highest=(SELECT max(price) FROM offer_price_history WHERE account_id=$5 AND offer_id=$6), price_average=(SELECT round(avg(price)) FROM offer_price_history WHERE account_id=$5 AND offer_id=$6), price_history_count=(SELECT count(*) FROM offer_price_history WHERE account_id=$5 AND offer_id=$6), discount_percent=CASE WHEN COALESCE($3,original_price)>$2 THEN round((COALESCE($3,original_price)-$2)*100.0/COALESCE($3,original_price)) ELSE discount_percent END, message=$7, validation_status='VALID', updated_at=now(), radar_updated_at=now() WHERE id=$6 AND account_id=$5",
          params: [snapshot.title, priceCents, originalCents, snapshot.thumbnail, event.account_id, offer.id, revised]
        });
      } else {
        operations.push({
          sql: "UPDATE offers SET title=COALESCE(NULLIF($1,''),title), image_url=COALESCE(NULLIF($2,''),image_url), message=$3, validation_status='VALID', updated_at=now(), radar_updated_at=now() WHERE id=$4 AND account_id=$5",
          params: [snapshot.title, snapshot.thumbnail, revised, offer.id, event.account_id]
        });
      }
      operations.push({
        sql: "UPDATE publications SET message=$3 WHERE offer_id=$1 AND account_id=$2 AND status IN ('READY','RETRY','SCHEDULED')",
        params: [offer.id, event.account_id, revised]
      });
      await db.transaction(operations);
      updatedOffers++;
    }
  }

  const finalStatus = updatedOffers ? 'PROCESSED' : (item.status === 'active' ? 'PROCESSED_NO_MATCH' : 'PROCESSED_NO_UPDATE');
  await db.query(
    "UPDATE meli_notification_events SET status=$2, resource_snapshot=$3::jsonb, payload=COALESCE(payload,'{}'::jsonb) || jsonb_build_object('resource_snapshot',$3::jsonb,'matched_offers',$4), last_error=NULL, processed_at=now(), updated_at=now() WHERE id=$1",
    [event.id, finalStatus, JSON.stringify(snapshot), updatedOffers]
  );
  return { processed: 1, updatedOffers, unsupported: 0, failed: 0 };
}

export default async function(req, res) {
  const batchSize = Math.max(1, Math.min(20, Number(req.body?.limit) || 10));
  // Recover abandoned locks after a worker crash or timeout. Keep the retry ceiling intact.
  const stale = await db.query(
    "UPDATE meli_notification_events SET status=CASE WHEN processing_attempts >= 5 THEN 'FAILED_FINAL' ELSE 'FAILED' END, last_error='Processamento interrompido; evento liberado para recuperação automática.', updated_at=now() WHERE status='PROCESSING' AND updated_at < now()-interval '15 minutes' RETURNING id"
  );
  const candidates = (await db.query(
    "SELECT id FROM meli_notification_events WHERE status IN ('RECEIVED','FAILED') AND processing_attempts < 5 ORDER BY received_at ASC LIMIT $1",
    [batchSize]
  )).rows;

  const totals = { scanned: candidates.length, recoveredStale: stale.rows.length, processed: 0, updatedOffers: 0, unsupported: 0, failed: 0, skipped: 0 };
  for (const candidate of candidates) {
    const claimed = (await db.query(
      "UPDATE meli_notification_events SET status='PROCESSING', processing_attempts=processing_attempts+1, updated_at=now() WHERE id=$1 AND status IN ('RECEIVED','FAILED') RETURNING *",
      [candidate.id]
    )).rows[0];
    if (!claimed) { totals.skipped++; continue; }
    if (!claimed.account_id) {
      await db.query("UPDATE meli_notification_events SET status='IGNORED', last_error='Conta conectada não encontrada.', processed_at=now(), updated_at=now() WHERE id=$1", [claimed.id]);
      totals.skipped++;
      continue;
    }
    try {
      const result = await processEvent(claimed);
      for (const key of ['processed','updatedOffers','unsupported','failed']) totals[key] += result[key] || 0;
    } catch (error) {
      const attempts = Number(claimed.processing_attempts) || 1;
      const finalStatus = attempts >= 5 ? 'FAILED_FINAL' : 'FAILED';
      await db.query(
        'UPDATE meli_notification_events SET status=$2, last_error=$3, updated_at=now() WHERE id=$1',
        [claimed.id, finalStatus, clean(error?.message || error?.code || 'Falha no processamento da notificação.', 250)]
      );
      totals.failed++;
      console.error('meli notification worker', JSON.stringify({ id: claimed.id, code: clean(error?.code || error?.name || 'ERROR', 60) }));
    }
  }
  if (candidates.length === batchSize) {
    const pending = (await db.query("SELECT id FROM meli_notification_events WHERE status IN ('RECEIVED','FAILED') AND processing_attempts < 5 LIMIT 1")).rows.length > 0;
    if (pending) {
      try { await scheduler.now('/api/jobs/mercadolivre-notifications'); }
      catch (error) { console.error('meli notification continuation failed', clean(error?.code || error?.name || 'ERROR', 60)); }
    }
  }
  return res.json({ ok: totals.failed === 0, ...totals });
}