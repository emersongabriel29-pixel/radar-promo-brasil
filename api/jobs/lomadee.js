import { config, db, scheduler } from 'hatchable';
import { fingerprint, message as promoMessage, offerScore } from 'lib/automation.js';

export const access = 'scheduler';
export const methods = ['POST'];
const BASE = 'https://api.lomadee.com.br';
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const list = body => Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : Array.isArray(body?.products) ? body.products : [];
// The API may return prices as decimal reais (e.g. 72.26) or integer cents (e.g. 7226).
const priceCents = value => { const n = Number(value); return Number.isFinite(n) && n > 0 ? (Number.isInteger(n) ? n : Math.round(n * 100)) : NaN; };

async function readCredentials(row) {
  let raw = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (raw.length < 32) raw = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (raw.length < 32) throw new Error('Chave mestra de credenciais ausente');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + '|radar-marketplace-credentials|' + row.account_id + '|LOMADEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function request(path, apiKey, params = {}, method = 'GET', payload = null) {
  const url = new URL(BASE + path);
  if (method === 'GET') for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  const response = await fetch(url.toString(), {
    method,
    headers: { 'x-api-key': apiKey, accept: 'application/json', ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(payload || {}) } : {}),
    signal: AbortSignal.timeout(20000)
  });
  const bodyText = await response.text();
  let body = {};
  try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { body = {}; }
  if (!response.ok) throw Object.assign(new Error('HTTP ' + response.status), { status: response.status });
  return body;
}

export default async function handler(req, res) {
  const credentialsRows = (await db.query(
    "SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='LOMADEE' AND status='VALIDATED'"
  )).rows;
  const totals = { accounts: credentialsRows.length, scanned: 0, imported: 0, duplicates: 0, skipped: 0, failed: 0, autopilotRuns: 0 };
  for (const row of credentialsRows) {
    let accountImported = 0;
    try {
      const credentials = await readCredentials(row);
      const apiKey = clean(credentials.apiKey, 4096);
      if (!apiKey) throw new Error('Chave API ausente');
      const response = await request('/affiliate/products', apiKey, { page: 1, limit: 100, isAvailable: true });
      const products = list(response);
      totals.scanned += products.length;
      totals.skipReasons ||= { unavailable: 0, missingTitle: 0, missingOrganization: 0, missingProductUrl: 0, missingImage: 0, invalidPrice: 0, noDiscount: 0, noAffiliateLink: 0 };
      for (const product of products) {
        const option = (Array.isArray(product.options) ? product.options : []).find(x => x.available) || product.options?.[0] || {};
        const pricing = Array.isArray(option.pricing) ? option.pricing[0] : {};
        const title = clean(option.name || product.name, 220);
        const productUrl = typeof product.url === 'string' && /^https:\/\//i.test(product.url) ? product.url : '';
        const imageUrl = product.images?.[0]?.url || option.images?.[0]?.url || '';
        const originalPrice = priceCents(pricing.listPrice), currentPrice = priceCents(pricing.price);
        if (!product.available || option.available === false) {
          totals.skipped++; totals.skipReasons.unavailable++; continue;
        }
        if (!title) { totals.skipped++; totals.skipReasons.missingTitle++; continue; }
        if (!product.organizationId) { totals.skipped++; totals.skipReasons.missingOrganization++; continue; }
        if (!productUrl) { totals.skipped++; totals.skipReasons.missingProductUrl++; continue; }
        if (!/^https:\/\//i.test(imageUrl)) { totals.skipped++; totals.skipReasons.missingImage++; continue; }
        if (!Number.isSafeInteger(originalPrice) || !Number.isSafeInteger(currentPrice) || currentPrice <= 0) {
          totals.skipped++; totals.skipReasons.invalidPrice++; continue;
        }
        if (originalPrice <= currentPrice) { totals.skipped++; totals.skipReasons.noDiscount++; continue; }
        const fp = await fingerprint({ source: 'LOMADEE', externalId: clean(product.id, 120), productUrl, title });
        const exists = await db.query('SELECT id FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1', [row.account_id, fp]);
        if (exists.rows.length) { totals.duplicates++; continue; }
        const shortResponse = await request('/affiliate/shortener/url', apiKey, {}, 'POST', {
          organizationId: String(product.organizationId), type: 'Custom', url: productUrl
        });
        const affiliateUrl = (Array.isArray(shortResponse) ? shortResponse : list(shortResponse))
          .flatMap(x => Array.isArray(x.shortUrls) ? x.shortUrls : [])
          .find(v => typeof v === 'string' && /^https:\/\//i.test(v));
        if (!affiliateUrl) { totals.skipped++; totals.skipReasons.noAffiliateLink++; continue; }
        const discount = Math.round((originalPrice - currentPrice) * 100 / originalPrice);
        const score = offerScore({ title, currentPrice, originalPrice });
        const promo = promoMessage({ title, source: 'LOMADEE', currentPrice, originalPrice, affiliateUrl, imageUrl, productUrl });
        const inserted = await db.query(
          "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible) VALUES($1,$2,$3,'LOMADEE',$4,$5,NULL,$6,$7,$8,NULL,NULL,$9,$10,'APPROVED',$11,$12,'VALIDATED','AUTO',false) ON CONFLICT DO NOTHING RETURNING id",
          [crypto.randomUUID(), row.account_id, title, originalPrice, currentPrice, affiliateUrl, imageUrl, productUrl, discount, score, promo, fp]
        );
        if (inserted.rows.length) { totals.imported++; accountImported++; }
        else totals.duplicates++;
      }
      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'", [row.account_id]);
      if (accountImported) {
        try { await scheduler.now('/api/jobs/autopilot'); totals.autopilotRuns++; }
        catch (error) { console.error('lomadee autopilot trigger failed', String(error?.code || error?.name || 'ERROR').slice(0, 60)); }
      }
    } catch (error) {
      totals.failed++;
      const code = Number(error?.status) || 0;
      const safeError = code === 401 ? 'Lomadee API Key inválida (HTTP 401).' : code === 403 ? 'A chave Lomadee não tem o escopo necessário; confira products:read e shortener:write.' : code === 429 ? 'Limite da API Lomadee atingido; a próxima execução tentará novamente.' : 'Falha de conexão ou resposta da API Lomadee.';
      await db.query("UPDATE marketplace_api_credentials SET last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'", [row.account_id, safeError]);
      console.error('lomadee ingestion failed', String(code || error?.name || 'ERROR').slice(0, 60));
    }
  }
  return res.json({ ok: totals.failed === 0, ...totals });
}