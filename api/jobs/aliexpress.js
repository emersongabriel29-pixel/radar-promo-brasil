import { config, db, scheduler } from 'hatchable';
import { signAliExpressParams } from 'lib/afilimax-aliexpress-provider.js';
import { fingerprint, offerScore } from 'lib/automation.js';
import { classifyProduct } from 'lib/category-classifier.js';
import { formatPromo } from 'lib/promo-message.js';
import { directImageUrl, httpsUrl } from 'lib/validation.js';
// API catalog items are not filtered by product category.

export const access = 'scheduler';
export const methods = ['POST'];

const API_URL = 'https://api-sg.aliexpress.com/sync';
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const fromB64 = v => Uint8Array.from(atob(v), c => c.charCodeAt(0));
const fields = 'product_id,product_title,product_main_image_url,product_detail_url,promotion_link,target_sale_price,target_original_price,sale_price,discount,commission_rate,evaluate_rate,lastest_volume,first_level_category_id,second_level_category_id,shop_id,shop_url';
const keywords = ['fone bluetooth', 'air fryer', 'smartwatch', 'notebook', 'fralda bebê', 'cafeteira', 'power bank', 'organizador casa', 'perfume feminino', 'tênis masculino', 'mochila', 'carregador rápido'];

async function decryptCredentials(row) {
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('credential_key_missing');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + row.account_id + '|ALIEXPRESS'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function requestProducts(credentials, keyword, pageNo = 1) {
  const appKey = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  const trackingId = clean(credentials.trackingId, 200);
  if (!appKey || !secret || !trackingId) throw new Error('credentials_missing');
  if (credentials.legacyApiAcknowledged !== 'true') throw new Error('legacy_api_acknowledgement_required');

  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const params = {
    app_key: appKey,
    format: 'json',
    method: 'aliexpress.affiliate.product.query',
    sign_method: 'sha256',
    timestamp: date.toISOString().slice(0, 19).replace('T', ' '),
    v: '2.0',
    fields,
    keywords: clean(keyword, 120),
    page_no: String(pageNo),
    page_size: '20',
    sort: 'SALE_PRICE_ASC',
    tracking_id: trackingId,
    target_currency: 'BRL',
    target_language: 'PT',
    ship_to_country: 'BR'
  };
  params.sign = await signAliExpressParams(params, secret);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && String(value) !== '') body.set(key, String(value));
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('aliexpress_invalid_json'); }
  if (!response.ok) throw new Error('aliexpress_http_' + response.status);
  if (data?.error_response) {
    const e = data.error_response;
    throw new Error('aliexpress_rejected_' + clean(e.code || e.sub_code || 'API_ERROR', 60));
  }
  const root = data?.aliexpress_affiliate_product_query_response || Object.values(data).find(v => v && typeof v === 'object' && v.resp_result);
  const result = root?.resp_result?.result || root?.resp_result || root || data;
  return findProducts(result).slice(0, 20);
}

async function requestAffiliateLink(credentials, productUrl) {
  const appKey = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  const trackingId = clean(credentials.trackingId, 200);
  if (!appKey || !secret || !trackingId) throw new Error('credentials_missing');
  if (credentials.legacyApiAcknowledged !== 'true') throw new Error('legacy_api_acknowledgement_required');
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const params = {
    app_key: appKey, format: 'json', method: 'aliexpress.affiliate.link.generate',
    sign_method: 'sha256', timestamp: date.toISOString().slice(0, 19).replace('T', ' '),
    v: '2.0', promotion_link_type: '0', source_values: (Array.isArray(productUrl) ? productUrl : [productUrl]).filter(Boolean).join(','), tracking_id: trackingId
  };
  params.sign = await signAliExpressParams(params, secret);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) body.set(key, String(value));
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('aliexpress_invalid_json'); }
  if (!response.ok) throw new Error('aliexpress_http_' + response.status);
  if (data?.error_response) {
    const e = data.error_response;
    throw new Error('aliexpress_rejected_' + clean(e.code || e.sub_code || 'API_ERROR', 60));
  }
  const textLinks = [];
  const walk = (value, depth = 0) => {
    if (!value || depth > 6) return;
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return; }
    if (typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (/promotion_link|promotionLink|tracking_url/i.test(key) && typeof item === 'string') textLinks.push(item);
        else if (item && typeof item === 'object') walk(item, depth + 1);
      }
    }
  };
  walk(data);
  const links = textLinks.map(httpsUrl).filter(Boolean);
  return Array.isArray(productUrl) ? links : (links[0] || '');
}

async function requestAdvanced(credentials, method, keyword, productId = '') {
  const appKey = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  const trackingId = clean(credentials.trackingId, 200);
  if (!appKey || !secret || !trackingId) throw new Error('credentials_missing');
  if (credentials.legacyApiAcknowledged !== 'true') throw new Error('legacy_api_acknowledgement_required');
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const params = {
    app_key: appKey, format: 'json', method, sign_method: 'sha256',
    timestamp: date.toISOString().slice(0, 19).replace('T', ' '), v: '2.0',
    fields, page_no: '1', tracking_id: trackingId,
    target_currency: 'BRL', target_language: 'PT', ship_to_country: 'BR'
  };
  if (method === 'aliexpress.affiliate.product.smartmatch') {
    const id = clean(productId, 30);
    if (!/^\d{1,30}$/.test(id)) throw new Error('smartmatch_product_id_missing');
    params.product_id = id;
    params.keywords = clean(keyword, 120);
    params.country = 'BR';
    params.device = 'PC';
    params.device_id = 'radar-promo-brasil';
    delete params.ship_to_country;
  } else if (method === 'aliexpress.affiliate.hotproduct.query') {
    params.page_size = '20';
  } else {
    throw new Error('unsupported_advanced_method');
  }
  params.sign = await signAliExpressParams(params, secret);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && String(value) !== '') body.set(key, String(value));
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('aliexpress_invalid_json'); }
  if (!response.ok) throw new Error('aliexpress_http_' + response.status);
  if (data?.error_response) {
    const e = data.error_response;
    throw new Error('aliexpress_rejected_' + clean(e.code || e.sub_code || 'API_ERROR', 60));
  }
  const root = data?.[method.replaceAll('.', '_') + '_response'] || Object.values(data).find(v => v && typeof v === 'object' && v.resp_result);
  const result = root?.resp_result?.result || root?.resp_result || root || data;
  return findProducts(result).slice(0, 20);
}

function findProducts(value, depth = 0) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object' || depth > 6) return [];
  for (const key of ['products', 'product', 'product_list', 'items', 'data']) {
    const child = value[key];
    if (Array.isArray(child)) return child;
    if (child && typeof child === 'object') {
      const found = findProducts(child, depth + 1);
      if (found.length) return found;
    }
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      const found = findProducts(child, depth + 1);
      if (found.length) return found;
    }
  }
  return [];
}

function percent(value) {
  const n = Number.parseFloat(String(value ?? '').replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? (n > 0 && n <= 1 ? n * 100 : n) : null;
}

function ratingPercent(value) {
  const raw = String(value ?? '').trim();
  const n = Number.parseFloat(raw.replace('%', '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  // AliExpress fields may be a 0-5 score or a percentage depending on API version.
  if (!raw.includes('%') && n <= 5) return Math.round(n * 20);
  return n <= 100 ? n : null;
}

function normalize(p) {
  const price = Number(String(p.target_sale_price ?? p.app_sale_price ?? p.sale_price ?? '').replace(',', '.'));
  const original = Number(String(p.target_original_price ?? p.original_price ?? '').replace(',', '.'));
  return {
    id: clean(p.product_id || p.productId, 100),
    title: clean(p.product_title || p.productTitle || p.title, 220),
    productUrl: httpsUrl(p.product_detail_url || p.productDetailUrl),
    affiliateUrl: httpsUrl(p.promotion_link || p.promotionLink || p.promotion_link_url),
    imageUrl: directImageUrl(p.product_main_image_url || p.productMainImageUrl) ? (p.product_main_image_url || p.productMainImageUrl) : '',
    currentPrice: Number.isFinite(price) && price > 0 ? Math.round(price * 100) : 0,
    originalPrice: Number.isFinite(original) && original > 0 ? Math.round(original * 100) : 0,
    commission: percent(p.commission_rate ?? p.commision_rate),
    rating: ratingPercent(p.evaluate_rate ?? p.evaluateRate),
    sales: Math.max(0, Number(p.lastest_volume ?? p.lastestVolume) || 0),
    categoryId: clean(p.second_level_category_id || p.first_level_category_id, 80),
    shopUrl: clean(p.shop_url, 1000)
  };
}

function isAliExpressUrl(value) {
  try {
    const u = new URL(String(value || ''));
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && !u.username && !u.password &&
      (host === 'aliexpress.com' || host.endsWith('.aliexpress.com') || host === 'aliexpress.us' || host.endsWith('.aliexpress.us'));
  } catch { return false; }
}

export default async function handler(req, res) {
  const rows = (await db.query("SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='ALIEXPRESS' AND status='VALIDATED'")).rows;
  const totals = { ok: true, accounts: rows.length, scanned: 0, imported: 0, duplicates: 0, skipped: 0, failed: 0, autopilotRuns: 0, rejectedBy: { missingId: 0, missingTitle: 0, invalidProductUrl: 0, missingAffiliateLink: 0, missingImage: 0, invalidPrice: 0, noVerifiedDiscount: 0, safetyFilter: 0, discountBelowThreshold: 0 }, qualitySignals: { missingCommission: 0, lowCommission: 0, missingRating: 0, lowRating: 0 } };
  for (const row of rows) {
    let accountImported = 0;
    try {
      const credentials = await decryptCredentials(row);
      const slot = Math.floor(Date.now() / 3600000);
      const selected = [0, 1, 2].map(offset => keywords[(slot * 3 + offset) % keywords.length]);
      const seen = new Set();
      const products = [];
      const collect = list => {
        for (const p of list || []) {
          const id = clean(p.product_id || p.productId, 100);
          if (id && !seen.has(id)) { seen.add(id); products.push(p); }
        }
      };
      for (const keyword of selected) {
        try {
          collect(await requestProducts(credentials, keyword, 1));
        } catch (error) {
          console.error('aliexpress search failed', JSON.stringify({ keyword, code: clean(error?.message || 'ERROR', 80) }));
        }
      }
      // Use the advanced API where available, while bounding each scheduled run to
      // five discovery calls (three keyword searches + Smart Match + Hot Products).
      const advancedKeyword = selected[0] || 'ofertas';
      for (const [method, label] of [
        ['aliexpress.affiliate.product.smartmatch', 'smartmatch'],
        ['aliexpress.affiliate.hotproduct.query', 'hotproducts']
      ]) {
        try {
          if (method === 'aliexpress.affiliate.product.smartmatch' && !products.length) throw new Error('smartmatch_skipped_no_seed_product');
          collect(await requestAdvanced(credentials, method, advancedKeyword, products.length ? (products[0].product_id || products[0].productId || '') : ''));
        } catch (error) {
          // Advanced methods can be unavailable on an approved app; standard search
          // remains the fallback and the failure is logged without exposing secrets.
          console.error('aliexpress advanced discovery failed', JSON.stringify({ method: label, code: clean(error?.message || 'ERROR', 80) }));
        }
      }
      totals.scanned += products.length;
      const categories = (await db.query('SELECT id,name FROM categories WHERE account_id=$1', [row.account_id])).rows;
      const candidates = [];
      const productUrls = products.slice(0, 20).map(raw => httpsUrl(raw.product_detail_url || raw.productDetailUrl)).filter(url => url && isAliExpressUrl(url));
      let generatedLinks = [];
      // The AliExpress link API may return only part of a large source_values batch.
      // Use small batches and preserve the response order for deterministic mapping.
      for (let offset = 0; offset < productUrls.length; offset += 5) {
        const batch = productUrls.slice(offset, offset + 5);
        try {
          const batchLinks = await requestAffiliateLink(credentials, batch);
          for (let i = 0; i < batch.length; i++) generatedLinks[offset + i] = batchLinks[i] || '';
        } catch (error) {
          for (let i = 0; i < batch.length; i++) generatedLinks[offset + i] = '';
          console.error('aliexpress batch short-link generation failed', clean(error?.message || 'ERROR', 80));
        }
      }
      for (const raw of products) {
        const p = normalize(raw);
        const sourceUrl = httpsUrl(raw.product_detail_url || raw.productDetailUrl);
        const sourceIndex = productUrls.indexOf(sourceUrl);
        const generated = sourceIndex >= 0 ? httpsUrl(generatedLinks[sourceIndex]) : '';
        // Ignore oversized promotion_link values from product discovery.
        p.affiliateUrl = generated && generated.length <= 300 ? generated : '';
        let reason = '';
        if (!p.id) reason = 'missingId';
        else if (!p.title) reason = 'missingTitle';
        else if (!p.productUrl || !isAliExpressUrl(p.productUrl)) reason = 'invalidProductUrl';
        else if (!p.currentPrice || p.currentPrice <= 0) reason = 'invalidPrice';
        else if (!p.affiliateUrl) reason = 'missingAffiliateLink';
        else if (!p.imageUrl) reason = 'missingImage';
        else if (p.originalPrice <= p.currentPrice) reason = 'noVerifiedDiscount';
        // No internal category exclusion.
        if (reason) { totals.skipped++; totals.rejectedBy[reason]++; continue; }
        const discount = Math.round((p.originalPrice - p.currentPrice) * 100 / p.originalPrice);
        if (discount < 10) { totals.skipped++; totals.rejectedBy.discountBelowThreshold++; continue; }
        // Missing commission/rating data no longer discards otherwise valid offers.
        // Known values are used for ranking; known low commission/rating are flagged for review.
        if (p.commission === null) totals.qualitySignals.missingCommission++;
        else if (p.commission < 3) totals.qualitySignals.lowCommission++;
        if (p.rating === null) totals.qualitySignals.missingRating++;
        else if (p.rating < 90) totals.qualitySignals.lowRating++;
        const classified = classifyProduct({ title: p.title, sourceCategory: 'AliExpress' });
        const category = categories.find(c => c.name.toLowerCase() === String(classified.category || '').toLowerCase()) ||
          categories.find(c => c.name.toLowerCase().includes('gerais')) || null;
        const fp = await fingerprint({ source: 'ALIEXPRESS', externalId: p.id, productUrl: p.productUrl, title: p.title });
        const qualityFlags = [];
        if (p.commission !== null && p.commission < 3) qualityFlags.push('LOW_COMMISSION');
        if (p.rating !== null && p.rating < 90) qualityFlags.push('LOW_RATING');
        candidates.push({ ...p, qualityFlags, discount, classified, category, fp, score: offerScore({ title: p.title, currentPrice: p.currentPrice, originalPrice: p.originalPrice }) });
      }
      candidates.sort((a, b) => b.score - a.score || b.sales - a.sales || (b.commission || 0) - (a.commission || 0) || a.currentPrice - b.currentPrice);
      // Bound database work per scheduled run so duplicate refreshes stay below the project query quota.
      for (const p of candidates.slice(0, 20)) {
        const exists = await db.query('SELECT id,current_price,original_price FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1', [row.account_id, p.fp]);
        if (exists.rows.length) {
          const existing = exists.rows[0];
          const refreshedPromo = formatPromo({ title: p.title, source: 'ALIEXPRESS', category: p.category?.name || p.classified.category || '', currentPrice: p.currentPrice, originalPrice: p.originalPrice, affiliateUrl: p.affiliateUrl, imageUrl: p.imageUrl, productUrl: p.productUrl });
          await db.query("UPDATE offers SET affiliate_url=$1,message=$2,updated_at=now() WHERE id=$3 AND account_id=$4 AND source='ALIEXPRESS' AND NULLIF($1,'') IS NOT NULL AND length($1)<=300", [p.affiliateUrl, refreshedPromo.message, existing.id, row.account_id]);
          await db.query("UPDATE publications SET message=$3 WHERE account_id=$1 AND offer_id=$2 AND status IN ('READY','RETRY','SCHEDULED')", [row.account_id, existing.id, refreshedPromo.message]);
          if (p.imageUrl) {
            await db.query("UPDATE offers SET image_url=$1,updated_at=now() WHERE id=$2 AND account_id=$3 AND source='ALIEXPRESS' AND status IN ('PENDING','APPROVED','PUBLISHED')", [p.imageUrl, existing.id, row.account_id]);
            await db.query("UPDATE publications SET image_url=$1 WHERE account_id=$2 AND offer_id=$3 AND status IN ('READY','RETRY')", [p.imageUrl, row.account_id, existing.id]);
          }
          if (Number(existing.current_price)===p.currentPrice && Number(existing.original_price)===p.originalPrice) {
            await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,$5,'OFFICIAL_API',$6,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours' AND price=$4 AND original_price=$5)", [crypto.randomUUID(), row.account_id, existing.id, p.currentPrice, p.originalPrice, 'ALIEXPRESS:' + p.id]);
          }
          totals.duplicates++; continue;
        }
        const promo = formatPromo({ title: p.title, source: 'ALIEXPRESS', category: p.category?.name || p.classified.category || '', currentPrice: p.currentPrice, originalPrice: p.originalPrice, affiliateUrl: p.affiliateUrl, imageUrl: p.imageUrl, productUrl: p.productUrl });
        const offerId = crypto.randomUUID();
        const inserted = await db.query(
          "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,subcategory,classification_tags,classification_confidence,classification_status,classification_reason,source_category) VALUES($1,$2,$3,'ALIEXPRESS',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'PENDING',$12,$13,'PENDING','ALIEXPRESS_AUTO',false,$14,$15::jsonb,$16,$18,$17,'AliExpress') ON CONFLICT DO NOTHING RETURNING id",
          [offerId, row.account_id, p.title, p.originalPrice, p.currentPrice, p.category?.id || null, p.affiliateUrl, p.imageUrl, p.productUrl, p.discount, p.score, promo.message, p.fp, p.classified.subcategory || null, JSON.stringify(p.classified.tags || []), p.classified.confidence || 0, p.qualityFlags.length ? p.qualityFlags.join('|') : 'Importação automática via API oficial; preço, desconto, link e imagem presentes.', p.qualityFlags.length ? 'REVIEW' : 'AUTO']
        );
        if (!inserted.rows.length) { totals.duplicates++; continue; }
        try {
          await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())", [crypto.randomUUID(), row.account_id, offerId, p.currentPrice, p.originalPrice, 'ALIEXPRESS:' + p.id]);
          await db.query("UPDATE offers SET status='PENDING',validation_status='PENDING_REVIEW',classification_status=$3,classification_reason=$4,updated_at=now() WHERE id=$1 AND account_id=$2 AND status='PENDING'", [offerId, row.account_id, p.qualityFlags.length ? 'REVIEW' : 'AUTO', p.qualityFlags.length ? p.qualityFlags.join('|') : 'Importação automática via API oficial; aguardando validação de requisitos.']);
          totals.imported++;
          accountImported++;
        } catch (error) {
          await db.query("UPDATE offers SET status='PENDING',validation_status='PENDING_REVIEW',classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2", [offerId, row.account_id, 'Falha ao registrar histórico de preço oficial; exige revisão.']);
          totals.failed++;
        }
      }
      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'", [row.account_id]);
      // The review gate auto-approves only offers that pass every hard requirement; low known commission/rating stays for human review.
    } catch (error) {
      totals.failed++;
      const code = clean(error?.message || 'ERROR', 100);
      await db.query("UPDATE marketplace_api_credentials SET last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'", [row.account_id, code]);
      console.error('aliexpress ingestion failed', code);
    }
  }
  if (totals.imported > 0) {
    try { await scheduler.now('/api/jobs/aliexpress-review'); totals.reviewTriggered = true; }
    catch (error) { totals.reviewTriggered = false; totals.reviewTriggerError = clean(error?.code || error?.name || 'REVIEW_TRIGGER_FAILED', 80); console.error('aliexpress review trigger failed', totals.reviewTriggerError); }
  }
  totals.ok = totals.failed === 0 && !totals.reviewTriggerError;
  return res.json({ ...totals, discovery: { standardKeywordSearches: 3, advancedMethodsAttempted: ['smartmatch', 'hotProducts'], maxDiscoveryCallsPerAccount: 8, affiliateLinkGenerationCap: 3 }, publicationEnabled: true, humanReviewRequired: 'ONLY_FAILED_REQUIREMENTS_OR_LOW_KNOWN_QUALITY', note: 'Ofertas que passam os requisitos serão aprovadas e enviadas ao fluxo automático; as que falham requisitos ou têm comissão/avaliação conhecida abaixo do limite ficam para revisão humana.' });
}