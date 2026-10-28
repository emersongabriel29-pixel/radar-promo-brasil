import { config, db } from 'hatchable';

const BASE_URL = 'https://api.lomadee.com.br';
const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

export function listLomadeeRows(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (body?.data && typeof body.data === 'object' && (body.data.shortUrl || body.data.originalUrl)) return [body.data];
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.shortUrls)) return body.shortUrls;
  return [];
}

export function normalizeLomadeeProductUrl(value) {
  try {
    const raw = String(value || '').replace(/&#38;/gi, '&').replace(/&amp;/gi, '&');
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    const pairs = [...url.searchParams.entries()].filter(([key]) =>
      !/^utm_/i.test(key) && !['lmdeetracking', 'gclid', 'fbclid'].includes(key.toLowerCase())
    ).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    const query = pairs.map(([key, item]) => encodeURIComponent(key) + '=' + encodeURIComponent(item)).join('&');
    return url.origin.toLowerCase() + url.pathname + (query ? '?' + query : '');
  } catch {
    return '';
  }
}

export function lomadeeProductPrices(product) {
  const option = (Array.isArray(product?.options) ? product.options : []).find(item => item?.available) || product?.options?.[0] || {};
  const pricing = Array.isArray(option.pricing) ? option.pricing[0] : {};
  const current = Number(pricing?.price);
  const original = Number(pricing?.listPrice);
  return {
    title: clean(option.name || product?.name, 220),
    available: Boolean(product?.available && option?.available !== false),
    currentPrice: Number.isFinite(current) && current > 0 ? Math.round(current * 100) : null,
    originalPrice: Number.isFinite(original) && original > 0 ? Math.round(original * 100) : null,
    url: typeof product?.url === 'string' && /^https:\/\//i.test(product.url) ? product.url : '',
    id: clean(product?.id, 120)
  };
}

async function getApiKey(accountId) {
  const row = (await db.query(
    "SELECT credentials_enc,nonce FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='LOMADEE' LIMIT 1",
    [accountId]
  )).rows[0];
  if (!row) throw new Error('Credencial Lomadee não configurada.');
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('Chave mestra de credenciais não configurada.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|LOMADEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  const credentials = JSON.parse(new TextDecoder().decode(plaintext));
  const apiKey = clean(credentials.apiKey, 4096);
  if (!apiKey) throw new Error('Chave API Lomadee ausente.');
  return apiKey;
}

export async function lomadeeGet(accountId, path, params = {}) {
  if (!['/affiliate/products', '/affiliate/shortener/urls'].includes(path)) throw new Error('Recurso Lomadee não permitido neste helper.');
  const apiKey = await getApiKey(accountId);
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url.toString(), {
    headers: { 'x-api-key': apiKey, accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  if (!response.ok) {
    const status = response.status;
    const providerMessage = clean(body?.message || body?.error || '', 120);
    throw Object.assign(new Error('Lomadee HTTP ' + status + (providerMessage ? ': ' + providerMessage : '')), { status });
  }
  return body;
}

export async function getLomadeeActiveLinks(accountId) {
  const body = await lomadeeGet(accountId, '/affiliate/shortener/urls', { page: 1, limit: 100 });
  const rows = listLomadeeRows(body);
  const links = new Set();
  const records = [];
  for (const row of rows) {
    const candidates = [
      ...(typeof row?.shortUrl === 'string' ? [row.shortUrl] : []),
      ...(Array.isArray(row?.shortUrls) ? row.shortUrls : [])
    ];
    for (const shortUrl of candidates) {
      if (row?.active === true && /^https:\/\/lmdee\.link\/[A-Za-z0-9]+$/i.test(shortUrl)) {
        links.add(shortUrl);
        records.push({ shortUrl, originalUrl: String(row?.originalUrl || ''), active: row?.active !== false, organizationId: String(row?.organizationId || '') });
      }
    }
  }
  return { links, records, count: rows.length };
}