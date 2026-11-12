import { config, db } from 'hatchable';
import { fingerprint, message as promoMessage, offerScore } from 'lib/automation.js';
import { classifyLomadeeProduct, normalizeLomadeeCategory } from 'lib/lomadee-catalog.js';
import { extractLomadeeShortUrl } from 'lib/lomadee-shortener.js';
import { directImageUrl } from 'lib/validation.js';

export const access = 'scheduler';
export const methods = ['POST'];

const BASE = 'https://api.lomadee.com.br';
function decodeHtmlEntities(value) {
  return String(value ?? '').replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, code) => {
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10);
    return Number.isInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : _;
  }).replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}
const clean = (value, max = 300) => decodeHtmlEntities(value).trim().slice(0, max);
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
  if (!response.ok) {
    const providerMessage = clean(body?.message || body?.error || body?.detail || body?.subMessage || '', 180);
    throw Object.assign(new Error('LOMADEE_HTTP_' + response.status + (providerMessage ? ':' + providerMessage : '')), { status: response.status });
  }
  return body;
}

function normalize(row) {
  const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const options = Array.isArray(raw.options) ? raw.options : [];
  const option = options.find(item => item?.available !== false) || options[0] || {};
  const pricing = Array.isArray(option.pricing) ? option.pricing[0] || {} : {};
  const title = clean(raw.name || row.title || option.name, 220);
  const productUrl = clean(raw.url || row.product_url, 2000);
  const imageUrl = [option.images?.[0]?.url, raw.images?.[0]?.url, option.imageUrl, raw.imageUrl, row.image_url].find(directImageUrl) || '';
  const currentPrice = priceCents(pricing.price) ?? priceCents(pricing.listPrice) ?? (Number(row.price_cents) > 0 ? Number(row.price_cents) : null);
  const listedPrice = priceCents(pricing.listPrice);
  const originalPrice = listedPrice && currentPrice ? Math.max(listedPrice, currentPrice) : currentPrice;
  const organizationId = clean(raw.organizationId, 80);
  const classification = classifyLomadeeProduct(raw);
  if (raw.available === false || option.available === false || row.available === false) return { error: 'UNAVAILABLE' };
  if (!title || !currentPrice || currentPrice <= 0 || !/^https:\/\//i.test(productUrl) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) return { error: 'NEEDS_DATA' };
  return { raw, title, productUrl, imageUrl, currentPrice, originalPrice, organizationId, classification, option };
}


function urlCode(shortUrl) {
  try { return new URL(shortUrl).pathname.split('/').filter(Boolean).pop() || ''; } catch { return ''; }
}

function canonicalProductUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return '';
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    // Variant/model/SKU parameters are product identity and must be preserved; only tracking parameters are removed.
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|gclid|fbclid|msclkid|lmdeetracking)$/i.test(key)) url.searchParams.delete(key);
    }
    const queryPairs = [...url.searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
    for (const [key, value] of queryPairs) url.searchParams.append(key, value);
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    return url.protocol + '//' + hostname + (url.port ? ':' + url.port : '') + pathname + url.search;
  } catch { return ''; }
}
function productPathKey(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return '';
    return (url.protocol + '//' + url.hostname.toLowerCase().replace(/^www\./, '') + (url.port ? ':' + url.port : '') + url.pathname.replace(/\/+$/, '')).toLowerCase();
  } catch { return ''; }
}

async function verifiedShortUrl(apiKey, shortUrl, productUrl) {
  const code = urlCode(shortUrl);
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(code)) return false;
  const body = await apiRequest('/affiliate/shortener/urls/' + encodeURIComponent(code), apiKey);
  const data = body?.data && !Array.isArray(body.data) ? body.data : body;
  if (!data || typeof data.shortUrl !== 'string' || typeof data.originalUrl !== 'string') return false;
  const sameShort = data.shortUrl.replace(/\/$/, '') === shortUrl.replace(/\/$/, '');
  // Lomadee appends its own attribution parameters to originalUrl; compare after removing only those parameters.
  const sameTarget = canonicalProductUrl(data.originalUrl) === canonicalProductUrl(productUrl);
  return sameShort && sameTarget && data.active !== false;
}

export default async function handler(req, res) {
  const limit = Math.min(10, Math.max(1, Math.floor(Number(req.body?.limit) || 10)));
  await db.query("UPDATE affiliate_discovery_items SET processing_status='READY_FOR_LINK',processing_error='RECOVERED_STALE_PROCESSING',last_seen_at=now() WHERE marketplace='LOMADEE' AND kind='PRODUCT' AND processing_status='PROCESSING' AND last_seen_at<now()-interval '10 minutes'");
  await db.query(`UPDATE affiliate_discovery_items SET processing_status='READY_FOR_LINK',processing_error='MASTER_RULE_REPROCESS',last_seen_at=now() WHERE marketplace='LOMADEE' AND kind='PRODUCT' AND processing_status='BLOCKED_SAFETY'`);
  await db.query(`UPDATE affiliate_discovery_items SET processing_status='READY_FOR_LINK',processing_error='MASTER_RULE_REPROCESS',last_seen_at=now() WHERE marketplace='LOMADEE' AND kind='PRODUCT' AND processing_status='NEEDS_DATA' AND NULLIF(trim(title),'') IS NOT NULL AND price_cents>0 AND product_url LIKE 'https://%' AND COALESCE(raw_data->>'organizationId','') <> ''`);
  const credentialsRows = (await db.query(
    "SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='LOMADEE' AND status='VALIDATED' ORDER BY account_id"
  )).rows;
  const summary = { accounts: credentialsRows.length, claimed: 0, linked: 0, duplicates: 0, deferred: 0, blocked: 0, needsData: 0, failed: 0, skippedNoCredential: 0, items: [] };

  for (const credentialRow of credentialsRows) {
    let apiKey;
    try { apiKey = await readCredentials(credentialRow); }
    catch { summary.skippedNoCredential++; continue; }

    const claimed = await db.query(`
      -- Randomize within a bounded oldest-first window instead of sorting the entire ready queue.
      WITH candidate_window AS MATERIALIZED (
        SELECT id FROM affiliate_discovery_items
        WHERE account_id=$1 AND marketplace='LOMADEE' AND kind='PRODUCT'
          AND processing_status='READY_FOR_LINK'
        ORDER BY last_seen_at ASC
        LIMIT ($2::int * 4)
        FOR UPDATE SKIP LOCKED
      ), batch AS (
        SELECT id FROM candidate_window ORDER BY random() LIMIT $2
      )
      UPDATE affiliate_discovery_items i
      SET processing_status='PROCESSING',processing_error='',last_seen_at=now()
      FROM batch WHERE i.id=batch.id
      RETURNING i.id,i.account_id,i.external_id,i.title,i.product_url,i.image_url,i.price_cents,i.available,i.raw_data
    `, [credentialRow.account_id, limit - summary.claimed]);
    summary.claimed += claimed.rows.length;

    const organizationCounts = new Map();
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

        const externalId = clean(row.external_id || item.raw.id, 120);
        const linkedByQueueId = externalId ? (await db.query(
          "SELECT o.id FROM affiliate_discovery_items d JOIN offers o ON o.id=d.offer_id AND o.account_id=d.account_id WHERE d.account_id=$1 AND d.marketplace='LOMADEE' AND d.kind='PRODUCT' AND d.external_id=$2 AND d.processing_status='LINKED' AND o.source='LOMADEE' ORDER BY d.processed_at DESC NULLS LAST LIMIT 1",
          [credentialRow.account_id, externalId]
        )).rows[0] : null;
        const linkedByHistory = externalId ? (await db.query(
          "SELECT o.id FROM offer_price_history h JOIN offers o ON o.id=h.offer_id AND o.account_id=h.account_id WHERE h.account_id=$1 AND h.source_reference=$2 AND o.source='LOMADEE' ORDER BY h.verified_at DESC NULLS LAST LIMIT 1",
          [credentialRow.account_id, 'LOMADEE:' + externalId]
        )).rows[0] : null;
        const pathKey = productPathKey(item.productUrl);
        const pathCandidates = pathKey ? (await db.query(
          "SELECT id,product_url FROM offers WHERE account_id=$1 AND source='LOMADEE' AND lower(replace(rtrim(split_part(split_part(product_url,'?',1),'#',1), '/'), 'https://www.', 'https://'))=$2 ORDER BY created_at,id LIMIT 20",
          [credentialRow.account_id, pathKey]
        )).rows : [];
        const existingByCanonicalUrl = pathCandidates.find(candidate => canonicalProductUrl(candidate.product_url) === canonicalProductUrl(item.productUrl));
        const existingProduct = linkedByQueueId || linkedByHistory || existingByCanonicalUrl || null;
        if (existingProduct) {
          await db.query("UPDATE affiliate_discovery_items SET processing_status='DUPLICATE',processing_error='DUPLICATE_PRODUCT_URL_VARIANT',offer_id=$2,processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$3", [row.id, existingProduct.id, credentialRow.account_id]);
          summary.duplicates++;
          continue;
        }
        const organizationCount = organizationCounts.get(item.organizationId) || 0;
        if (organizationCount >= 2) {
          await db.query("UPDATE affiliate_discovery_items SET processing_status='READY_FOR_LINK',processing_error='DEFERRED_DIVERSITY',last_seen_at=now() WHERE id=$1 AND account_id=$2", [row.id, credentialRow.account_id]);
          summary.deferred++;
          continue;
        }
        organizationCounts.set(item.organizationId, organizationCount + 1);

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
        const affiliateUrl = extractLomadeeShortUrl(created);
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
          const raced = (await db.query('SELECT id FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1', [credentialRow.account_id, fp])).rows[0];
          if (!raced) throw new Error('OFFER_CONFLICT_WITHOUT_FINGERPRINT_MATCH');
          await db.query(
            "INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,$5,'OFFICIAL_API',$6,now() WHERE NOT EXISTS (SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_reference=$6)",
            [crypto.randomUUID(), credentialRow.account_id, raced.id, item.currentPrice, item.originalPrice, 'LOMADEE:' + clean(row.external_id || item.raw.id, 120)]
          );
          await db.query("UPDATE affiliate_discovery_items SET processing_status='LINKED',offer_id=$2,processing_error='DUPLICATE_FINGERPRINT',processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$3", [row.id, raced.id, credentialRow.account_id]);
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
        const providerMessage = clean(error?.message || '', 240).toLowerCase();
        const providerStatus = Number(error?.status) || 0;
        const blockedStatus = /organization approval is required|approval required/.test(providerMessage)
          ? 'BLOCKED_PROVIDER_APPROVAL'
          : /channel is not allowed by the organization|channel not allowed/.test(providerMessage)
            ? 'BLOCKED_PROVIDER_CHANNEL' : '';
        const safeReason = clean(stage + ':' + (error?.message || 'ERROR'), 180);
        if (blockedStatus) {
          await db.query('UPDATE affiliate_discovery_items SET processing_status=$2,processing_error=$3,processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$4', [row.id, blockedStatus, safeReason, credentialRow.account_id]);
          summary.blocked++;
        } else {
          summary.failed++;
          await db.query("UPDATE affiliate_discovery_items SET processing_status='FAILED',processing_error=$2,processed_at=now(),last_seen_at=now() WHERE id=$1 AND account_id=$3", [row.id, safeReason, credentialRow.account_id]);
        }
        summary.items.push({ queueId: row.id, error: safeReason, httpStatus: providerStatus || null, status: blockedStatus || 'FAILED' });
      }
    }
    if (summary.claimed >= limit) break;
  }

  if (summary.failed === 0 && summary.linked + summary.duplicates + summary.blocked + summary.needsData > 0) {
    for (const credentialRow of credentialsRows) {
      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'", [credentialRow.account_id]);
    }
  }
  const counts = (await db.query("SELECT processing_status,count(*)::int AS count FROM affiliate_discovery_items WHERE marketplace='LOMADEE' AND kind='PRODUCT' GROUP BY processing_status ORDER BY processing_status")).rows;
  const remaining = counts.reduce((total, row) => total + (row.processing_status === 'READY_FOR_LINK' ? Number(row.count) : 0), 0);
  const resumeScheduled = false;
  const resumeError = remaining > 0 ? 'HOURLY_CRON_CONTINUES_BACKLOG' : '';
  if (summary.failed > 0) return res.status(500).json({
    ok: false, provider: 'LOMADEE', ...summary, counts, remaining, resumeScheduled: false, resumeError,
    readOnlySource: false, offersCreated: summary.linked, publicationsCreated: 0, messagesSent: 0,
    autopilotTriggered: false, publicationTriggered: false,
    note: 'Falhas individuais registradas; nenhum fluxo de publicação foi acionado.'
  });
  return res.json({
    ok: true, provider: 'LOMADEE', ...summary, counts, remaining, resumeScheduled, resumeError,
    readOnlySource: false, offersCreated: summary.linked, publicationsCreated: 0, messagesSent: 0,
    autopilotTriggered: false, publicationTriggered: false,
    note: 'Gera e verifica links oficiais; cria apenas rascunhos PENDING/NEEDS_REVIEW invisíveis na vitrine. Não publica nem envia mensagens.'
  });
}