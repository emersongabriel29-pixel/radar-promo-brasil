import { config, db } from 'hatchable';
import { fingerprint, message as promoMessage, offerScore } from 'lib/automation.js';
import { classifyLomadeeProduct, normalizeLomadeeCategory } from 'lib/lomadee-catalog.js';
import { directImageUrl } from 'lib/validation.js';

export const access = 'scheduler';
export const methods = ['POST'];

const BASE = 'https://api.lomadee.com.br';
const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const parseMoney = value => {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().replace(/[^0-9,.-]/g, '');
  if (!raw) return null;
  const comma = raw.lastIndexOf(','), dot = raw.lastIndexOf('.');
  const normalized = comma >= 0 && dot >= 0
    ? (comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, ''))
    : comma >= 0 ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const priceCents = value => {
  const n = parseMoney(value);
  return n === null ? null : Math.round(n * 100);
};
const list = body => Array.isArray(body) ? body
  : Array.isArray(body?.data) ? body.data
  : Array.isArray(body?.items) ? body.items
  : Array.isArray(body?.products) ? body.products : [];

async function readCredentials(row) {
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('CREDENTIAL_MASTER_KEY_MISSING');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + row.account_id + '|LOMADEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  const credentials = JSON.parse(new TextDecoder().decode(plain));
  const apiKey = clean(credentials.apiKey, 4096);
  if (!apiKey) throw new Error('LOMADEE_API_KEY_MISSING');
  return apiKey;
}

async function apiRequest(path, apiKey, method = 'GET', payload = null) {
  const response = await fetch(BASE + path, {
    method,
    headers: { 'x-api-key': apiKey, accept: 'application/json', ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(payload || {}) } : {}),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) throw Object.assign(new Error('LOMADEE_HTTP_' + response.status), { status: response.status });
  return body;
}

function normalize(row) {
  const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const options = Array.isArray(raw.options) ? raw.options : [];
  const option = options.find(item => item?.available !== false) || options[0] || {};
  const pricing = Array.isArray(option.pricing) ? option.pricing[0] || {} : {};
  const title = clean(option.name || raw.name || row.title, 220);
  const productUrl = clean(raw.url || row.product_url, 2000);
  const imageUrl = [option.images?.[0]?.url, raw.images?.[0]?.url, option.imageUrl, raw.imageUrl, row.image_url].find(directImageUrl) || '';
  const currentPrice = priceCents(pricing.price) ?? priceCents(pricing.listPrice) ?? (Number(row.price_cents) > 0 ? Number(row.price_cents) : null);
  const listedPrice = priceCents(pricing.listPrice);
  const originalPrice = listedPrice && currentPrice ? Math.max(listedPrice, currentPrice) : currentPrice;
  const organizationId = clean(raw.organizationId, 80);
  const classification = classifyLomadeeProduct(raw);
  if (classification.blocked) return { error: 'BLOCKED_SAFETY' };
  if (raw.available === false || option.available === false || row.available === false) return { error: 'UNAVAILABLE' };
  if (!title || !currentPrice || currentPrice <= 0 || !originalPrice || !/^https:\/\//i.test(productUrl) || !directImageUrl(imageUrl) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) return { error: 'NEEDS_DATA' };
  return { raw, title, productUrl, imageUrl, currentPrice, originalPrice, organizationId, classification, option };
}

function extractShortUrl(body) {
  const rows = Array.isArray(body) ? body : list(body);
  return rows.flatMap(row => Array.isArray(row?.shortUrls) ? row.shortUrls : (typeof row?.shortUrl === 'string' ? [row.shortUrl] : []))
    .find(value => typeof value === 'string' && /^https:\/\//i.test(value)) || '';
}

function urlCode(shortUrl) {
  try { return new URL(shortUrl).pathname.split('/').filter(Boolean).pop() || ''; } catch { return ''; }
}

async function verifiedShortUrl(apiKey, shortUrl, productUrl) {
  const code = urlCode(shortUrl);
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(code)) return false;
  const body = await apiRequest('/affiliate/shortener/urls/' + encodeURIComponent(code), apiKey);
  const data = body?.data && !Array.isArray(body.data) ? body.data : body;
  if (!data || typeof data.shortUrl !== 'string' || typeof data.originalUrl !== 'string') return false;
  const sameShort = data.shortUrl.replace(/\/$/, '') === shortUrl.replace(/\/$/, '');
  const sameTarget = data.originalUrl === productUrl;
  return sameShort && sameTarget && data.active !== false;
}

export default async function handler(req, res) {
  const limit = Math.min(10, Math.max(1, Math.floor(Number(req.body?.limit) || 5)));
  const credentialsRows = (await db.query(
    "SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='LOMADEE' AND status='VALIDATED' ORDER BY account_id"
  )).rows;
  const summary = { accounts: credentialsRows.length, claimed: 0, linked: 0, duplicates: 0, blocked: 0, needsData: 0, failed: 0, skippedNoCredential: 0, items: [] };

  for (const credentialRow of credentialsRows) {
    let apiKey;
    try { apiKey = await readCredentials(credentialRow); }
    catch { summary.skippedNoCredential++; continue; }

    const claimed = await db.query(`
      WITH batch AS (
        SELECT id FROM affiliate_discovery_items
        WHERE account_id=$1 AND marketplace='LOMADEE' AND kind='PRODUCT'
          AND processing_status='READY_FOR_LINK'
        ORDER BY first_seen_at,id LIMIT $2 FOR UPDATE SKIP LOCKED
      )
      UPDATE affiliate_discovery_items i
      SET processing_status='PROCESSING',processing_error='',last_seen_at=now()
      FROM batch WHERE i.id=batch.id
      RETURNING i.id,i.account_id,i.external_id,i.title,i.product_url,i.image_url,i.price_cents,i.available,i.raw_data
    `, [credentialRow.account_id, limit - summary.claimed]);
    summary.claimed += claimed.rows.length;

    for (const row of claimed.rows) {
      let stage = 'PRECHECK';
      try {
        const item = normalize(row);
        if (item.error) {
          const status = item.error === 'BLOCKED_SAFETY' ? 'BLOCKED_SAFETY' : 'NEEDS_DATA';
          await db.query('UPDATE affiliate_discovery_items SET processing_status=$2,processing_error=$3,processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$4', [row.id, status, item.error, credentialRow.account_id]);
          if (status === 'BLOCKED_SAFETY') summary.blocked++; else summary.needsData++;
          continue;
        }

        const fp = await fingerprint({
          source: 'LOMADEE', externalId: clean(row.external_id || item.raw.id, 120),
          productUrl: item.productUrl, title: item.title, organizationId: item.organizationId,
          currentPrice: item.currentPrice, originalPrice: item.originalPrice,
          variant: item.option.id || item.option.sku || ''
        });
        const existing = (await db.query(
          'SELECT id FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1',
          [credentialRow.account_id, fp]
        )).rows[0];
        if (existing) {
          await db.query(
            "INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,$5,'OFFICIAL_API',$6,now() WHERE NOT EXISTS (SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_reference=$6)",
            [crypto.randomUUID(), credentialRow.account_id, existing.id, item.currentPrice, item.originalPrice, 'LOMADEE:' + clean(row.external_id || item.raw.id, 120)]
          );
          await db.query("UPDATE affiliate_discovery_items SET processing_status='LINKED',offer_id=$2,processing_error='DUPLICATE_OFFER',processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$3", [row.id, existing.id, credentialRow.account_id]);
          summary.duplicates++;
          continue;
        }

        stage = 'SHORTENER_CREATE';
        const created = await apiRequest('/affiliate/shortener/url', apiKey, 'POST', {
          organizationId: item.organizationId, type: 'Custom', url: item.productUrl
        });
        const affiliateUrl = extractShortUrl(created);
        if (!affiliateUrl) throw new Error('SHORTENER_RETURNED_NO_URL');

        stage = 'SHORTENER_VERIFY';
        if (!await verifiedShortUrl(apiKey, affiliateUrl, item.productUrl)) throw new Error('SHORT_URL_VERIFICATION_FAILED');

        stage = 'OFFER_INSERT';
        const categoryRows = (await db.query('SELECT id,name FROM categories WHERE account_id=$1 ORDER BY created_at,id', [credentialRow.account_id])).rows;
        const categoryMap = new Map(categoryRows.map(category => [normalizeLomadeeCategory(category.name), category.id]));
        const categoryId = categoryMap.get(normalizeLomadeeCategory(item.classification.category)) || categoryMap.get('ofertas gerais') || null;
        const discount = Math.round((item.originalPrice - item.currentPrice) * 100 / item.originalPrice);
        const score = offerScore({ title: item.title, currentPrice: item.currentPrice, originalPrice: item.originalPrice });
        const message = promoMessage({ title: item.title, source: 'LOMADEE', currentPrice: item.currentPrice, originalPrice: item.originalPrice, affiliateUrl, imageUrl: item.imageUrl, productUrl: item.productUrl });
        const inserted = await db.query(
          "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,classification_tags,classification_confidence,classification_status,classification_reason,source_category,subcategory) VALUES($1,$2,$3,'LOMADEE',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'PENDING',$12,$13,'NEEDS_REVIEW','AUTO',false,$14::jsonb,$15,'REVIEW',$16,$17,$18) ON CONFLICT DO NOTHING RETURNING id",
          [crypto.randomUUID(), credentialRow.account_id, item.title, item.originalPrice, item.currentPrice, categoryId, affiliateUrl, item.imageUrl, item.productUrl, discount, score, message, fp, JSON.stringify(item.classification.tags), item.classification.confidence, 'lomadee_queue_worker_v1:' + item.classification.rule, item.classification.category, item.classification.subcategory]
        );
        if (!inserted.rows.length) {
          await db.query("UPDATE affiliate_discovery_items SET processing_status='LINKED',processing_error='DUPLICATE_FINGERPRINT',processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$2", [row.id, credentialRow.account_id]);
          summary.duplicates++;
          continue;
        }

        stage = 'PRICE_HISTORY';
        const offerId = inserted.rows[0].id;
        await db.query(
          "INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())",
          [crypto.randomUUID(), credentialRow.account_id, offerId, item.currentPrice, item.originalPrice, 'LOMADEE:' + clean(row.external_id || item.raw.id, 120)]
        );
        await db.query("UPDATE affiliate_discovery_items SET processing_status='LINKED',offer_id=$2,processing_error='',processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$3", [row.id, offerId, credentialRow.account_id]);
        summary.linked++;
        summary.items.push({ queueId: row.id, offerId, title: item.title, affiliateUrl, status: 'PENDING', validation: 'NEEDS_REVIEW' });
      } catch (error) {
        summary.failed++;
        const safeReason = clean(stage + ':' + (error?.message || 'ERROR'), 180);
        await db.query("UPDATE affiliate_discovery_items SET processing_status='FAILED',processing_error=$2,last_seen_at=now() WHERE id=$1 AND account_id=$3", [row.id, safeReason, credentialRow.account_id]);
        summary.items.push({ queueId: row.id, error: safeReason });
      }
    }
    if (summary.claimed >= limit) break;
  }

  const counts = (await db.query("SELECT processing_status,count(*)::int AS count FROM affiliate_discovery_items WHERE marketplace='LOMADEE' AND kind='PRODUCT' GROUP BY processing_status ORDER BY processing_status")).rows;
  return res.json({
    ok: summary.failed === 0, provider: 'LOMADEE', ...summary, counts,
    readOnlySource: false, offersCreated: summary.linked, publicationsCreated: 0, messagesSent: 0,
    autopilotTriggered: false, publicationTriggered: false,
    note: 'Gera e verifica links oficiais; cria apenas rascunhos PENDING/NEEDS_REVIEW invisíveis na vitrine. Não publica nem envia mensagens.'
  });
}
