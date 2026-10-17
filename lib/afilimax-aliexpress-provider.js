/*
 * Adapted from @afilimax/aliexpress-provider 0.1.0
 * Copyright (c) 2026 Marcuth. Original license: MIT.
 * Source: https://github.com/Afilimax/aliexpress-provider
 *
 * Radar adaptation: URL allowlist, bounded timeout, injectable fetch/clock,
 * and sanitized API errors. This provider is experimental until a real,
 * read-only credential test confirms the API contract for the account.
 */
const API_URL = 'https://api-sg.aliexpress.com/sync';
const API_METHOD = 'aliexpress.affiliate.link.generate';
const MAX_URL_LENGTH = 2000;

export function validateAliExpressProductUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return '';
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/\\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (!(host === 'aliexpress.com' || host.endsWith('.aliexpress.com') ||
          host === 'aliexpress.us' || host.endsWith('.aliexpress.us'))) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function timestampUtcPlusEight(nowMs) {
  const d = new Date(nowMs + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function signAliExpressParams(params, appSecret) {
  if (!appSecret || typeof appSecret !== 'string') throw new Error('AliExpress App Secret ausente.');
  const base = Object.keys(params)
    .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== null && String(params[key]) !== '')
    .sort()
    .map(key => key + String(params[key]))
    .join('');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(base)));
}

export async function createAliExpressAffiliateUrl({
  appKey,
  appSecret,
  trackingId,
  productUrl,
  fetchImpl = fetch,
  nowMs = Date.now()
}) {
  const safeProductUrl = validateAliExpressProductUrl(productUrl);
  if (!safeProductUrl) throw Object.assign(new Error('Informe uma URL HTTPS válida de produto do AliExpress.'), { status: 400 });
  const key = String(appKey ?? '').trim();
  const secret = String(appSecret ?? '');
  const tracking = String(trackingId ?? '').trim();
  if (!key || key.length > 200 || !secret || secret.length > 4096 || !tracking || tracking.length > 200) {
    throw Object.assign(new Error('App Key, App Secret e Tracking ID são obrigatórios.'), { status: 412 });
  }
  if (typeof fetchImpl !== 'function') throw new Error('Cliente HTTP indisponível.');

  const params = {
    app_key: key,
    method: API_METHOD,
    timestamp: timestampUtcPlusEight(nowMs),
    sign_method: 'sha256',
    v: '2.0',
    format: 'json',
    tracking_id: tracking,
    promotion_link_type: '0',
    source_values: safeProductUrl
  };
  const sign = await signAliExpressParams(params, secret);
  const query = new URLSearchParams({ ...params, sign });
  const response = await fetchImpl(API_URL + '?' + query.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw Object.assign(new Error('Gateway AliExpress respondeu HTTP ' + response.status + '.'), { status: 502 });

  let data;
  try {
    data = await response.json();
  } catch {
    throw Object.assign(new Error('Gateway AliExpress retornou uma resposta inválida.'), { status: 502 });
  }
  const root = data?.aliexpress_affiliate_link_generate_response;
  const result = root?.resp_result;
  if (!root || !result) throw Object.assign(new Error('Resposta AliExpress sem o resultado esperado.'), { status: 502 });
  if (Number(result.resp_code) !== 200) {
    const code = String(result.resp_code ?? 'API_ERROR').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    throw Object.assign(new Error('AliExpress recusou a geração do link (' + (code || 'API_ERROR') + ').'), { status: 502 });
  }
  const link = result.result?.promotion_links?.promotion_link?.[0]?.promotion_link;
  let parsed;
  try { parsed = new URL(String(link ?? '')); } catch { parsed = null; }
  const host = parsed?.hostname.toLowerCase().replace(/\\.$/, '') ?? '';
  if (!parsed || parsed.protocol !== 'https:' || parsed.username || parsed.password ||
      !(host === 'aliexpress.com' || host.endsWith('.aliexpress.com') ||
        host === 'aliexpress.us' || host.endsWith('.aliexpress.us'))) {
    throw Object.assign(new Error('AliExpress não retornou um link de afiliado HTTPS reconhecido.'), { status: 502 });
  }
  return parsed.toString();
}

export const __providerMetadata = Object.freeze({
  name: '@afilimax/aliexpress-provider',
  version: '0.1.0',
  license: 'MIT',
  source: 'https://github.com/Afilimax/aliexpress-provider',
  apiStatus: 'EXPERIMENTAL_LEGACY_AFFILIATE_METHOD'
});
