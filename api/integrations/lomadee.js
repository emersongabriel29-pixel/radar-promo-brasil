import { config, db, scheduler } from 'hatchable';
import { fingerprint, message as promoMessage, offerScore } from 'lib/automation.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

// Official affiliate API documented at docs.lomadee.com.br; production host is the target.
const BASE_URL = 'https://api.lomadee.com.br';
const clean = (value, max = 100) => String(value ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function getAccount(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
async function getCredentials(accountId) {
  const row = (await db.query(
    "SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='LOMADEE' LIMIT 1",
    [accountId]
  )).rows[0];
  if (!row) return null;
  let raw = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (raw.length < 32) raw = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (raw.length < 32) throw Object.assign(new Error('Configure API_CREDENTIALS_MASTER_KEY ou CONNECTOR_ENCRYPTION_KEY com pelo menos 32 caracteres.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + '|radar-marketplace-credentials|' + accountId + '|LOMADEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  const credentials = JSON.parse(new TextDecoder().decode(plain));
  return { credentials, status: row.status };
}
async function apiRequest(path, apiKey, params = {}, method = 'GET', payload = null) {
  if (!['/affiliate/products','/affiliate/brands','/affiliate/campaigns','/affiliate/channels','/affiliate/shortener/url'].includes(path)) {
    throw Object.assign(new Error('Recurso Lomadee não permitido.'), { status: 400 });
  }
  const url = new URL(BASE_URL + path);
  if (method === 'GET') {
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url.toString(), {
    method,
    headers: { 'x-api-key': apiKey, 'accept': 'application/json', ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(payload || {}) } : {}),
    signal: AbortSignal.timeout(20000)
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  if (!response.ok) {
    const status = response.status;
    const error = Object.assign(new Error(status === 401 ? 'Chave Lomadee inválida ou ausente.' : status === 403 ? 'A chave Lomadee não possui o escopo necessário para este recurso.' : status === 429 ? 'Limite da API Lomadee atingido; tente novamente mais tarde.' : 'A API Lomadee respondeu HTTP ' + status + '.'), { status });
    throw error;
  }
  return body;
}
function listFrom(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}
function safeRows(resource, body) {
  const rows = listFrom(body);
  if (resource === 'products') return rows.map(x => {
    const option = (Array.isArray(x.options) ? x.options : []).find(o => o.available) || x.options?.[0] || {};
    const pricing = Array.isArray(option.pricing) ? option.pricing[0] : {};
    const image = x.images?.[0]?.url || option.images?.[0]?.url || '';
    return {
      id: clean(x.id, 120), organizationId: clean(x.organizationId, 120),
      title: clean(option.name || x.name, 300), available: Boolean(x.available && (option.available !== false)),
      url: typeof x.url === 'string' && /^https:\/\//i.test(x.url) ? x.url.slice(0, 2000) : '',
      imageUrl: typeof image === 'string' && /^https:\/\//i.test(image) ? image.slice(0, 2000) : '',
      originalPrice: Number.isFinite(Number(pricing.listPrice)) ? Number(pricing.listPrice) : null,
      currentPrice: Number.isFinite(Number(pricing.price)) ? Number(pricing.price) : null,
      seller: clean(option.seller, 150), categories: Array.isArray(option.categories) ? option.categories.map(v => clean(v, 100)).slice(0, 10) : []
    };
  });
  if (resource === 'campaigns') return rows.map(x => ({
    id: clean(x.id, 120), organizationId: clean(x.organizationId, 120),
    title: clean(x.name, 300), type: clean(x.type, 40), offerType: clean(x.offerType, 40),
    status: clean(x.status, 40), description: clean(x.description, 1000),
    url: typeof x.url === 'string' && /^https:\/\//i.test(x.url) ? x.url.slice(0, 2000) : '',
    code: clean(x.code, 100), startAt: clean(x.period?.startAt, 50), endAt: clean(x.period?.endAt, 50),
    highlighted: Boolean(x.isHighlight), categories: Array.isArray(x.categories) ? x.categories.map(v => clean(v, 100)).slice(0, 10) : []
  }));
  if (resource === 'brands') return rows.map(x => ({
    id: clean(x.id || x.organizationId, 120), name: clean(x.name, 300),
    status: clean(x.status, 60), url: typeof x.url === 'string' && /^https:\/\//i.test(x.url) ? x.url.slice(0, 2000) : ''
  }));
  if (resource === 'channels') return rows.map(x => ({
    id: clean(x.id, 120), name: clean(x.name, 200),
    type: clean(x.availableChannel?.name || x.type, 100)
  }));
  return rows.map(x => ({ id: clean(x.id, 120), status: clean(x.status, 40) }));
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Lomadee.' });
  try {
    const account = await getAccount(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    const saved = await getCredentials(account.id);
    const resource = clean(req.query?.resource || 'status', 40).toLowerCase();
    if (req.method === 'GET' && resource === 'status') return res.json({
      marketplace: 'LOMADEE', status: saved?.status || 'NOT_CONFIGURED',
      configured: Boolean(saved), apiStatus: saved?.status === 'VALIDATED' ? 'VALIDATED' : saved ? 'PENDING_VALIDATION' : 'NOT_CONFIGURED',
      publicationEnabled: saved?.status === 'VALIDATED',
      capabilities: ['products:read','campaigns:read','brands:read','channels:read','shortener:write'],
      portalUrl: 'https://www.lomadee.com.br/pt-br/afiliados',
      docsUrl: 'https://docs.lomadee.com.br/llms.txt'
    });
    if (!saved) return res.status(412).json({ error: 'Cadastre a chave API oficial da Lomadee no painel antes de testar ou importar ofertas.' });
    const apiKey = clean(saved.credentials.apiKey, 4096);
    if (!apiKey) return res.status(412).json({ error: 'A credencial salva não contém a chave x-api-key da API Lomadee.' });

    if (req.method === 'POST') {
      const action = clean(req.body?.action, 40);
      if (action === 'validate') {
        try {
          const [products, campaigns, channels] = await Promise.all([
            apiRequest('/affiliate/products', apiKey, { page: 1, limit: 1 }),
            apiRequest('/affiliate/campaigns', apiKey, { page: 1, limit: 1, status: 'onTime' }),
            apiRequest('/affiliate/channels', apiKey, {})
          ]);
          await db.query(
            "UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'",
            [account.id]
          );
          return res.json({ ok: true, status: 'VALIDATED', checks: { products: listFrom(products).length, campaigns: listFrom(campaigns).length, channels: listFrom(channels).length }, capabilities: ['products:read','campaigns:read','brands:read','channels:read','shortener:write'], note: 'Consultas de leitura validadas. O escopo shortener:write será confirmado na primeira geração real de link; nenhum link foi criado neste teste.' });
        } catch (error) {
          const code = Number(error?.status) || 0;
          await db.query(
            "UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'",
            [account.id, code ? 'Consulta oficial falhou (HTTP ' + code + '). Verifique escopos da chave.' : 'Falha de conexão ou tempo limite na API oficial.']
          );
          return res.status(code === 401 || code === 403 ? code : 502).json({ error: error?.message || 'Não foi possível alcançar a API oficial da Lomadee.', status: 'ERROR' });
        }
      }
      if (action === 'import_products') {
        if (saved.status !== 'VALIDATED') return res.status(412).json({ error: 'Valide a conexão Lomadee antes de importar produtos.' });
        const search = clean(req.body?.search, 100);
        const limit = Math.min(10, Math.max(1, Math.floor(Number(req.body?.limit) || 5)));
        const productBody = await apiRequest('/affiliate/products', apiKey, { page: 1, limit, isAvailable: true, ...(search ? { search } : {}) });
        const products = listFrom(productBody);
        const imported = [], skipped = [];
        for (const product of products) {
          const option = (Array.isArray(product.options) ? product.options : []).find(o => o.available) || product.options?.[0] || {};
          const pricing = Array.isArray(option.pricing) ? option.pricing[0] : {};
          const title = clean(option.name || product.name, 220);
          const imageUrl = product.images?.[0]?.url || option.images?.[0]?.url || '';
          const productUrl = typeof product.url === 'string' && /^https:\/\//i.test(product.url) ? product.url : '';
          const currentPrice = Number(pricing.price), originalPrice = Number(pricing.listPrice);
          if (!product.available || option.available === false || !title || !product.organizationId || !productUrl || !/^https:\/\//i.test(imageUrl) || !Number.isSafeInteger(currentPrice) || currentPrice <= 0 || !Number.isSafeInteger(originalPrice) || originalPrice <= currentPrice) {
            skipped.push({ id: clean(product.id, 120), reason: 'Sem desconto verificável, imagem HTTPS, preço ou URL válidos.' });
            continue;
          }
          let shortResponse;
          try {
            shortResponse = await apiRequest('/affiliate/shortener/url', apiKey, {}, 'POST', {
              organizationId: String(product.organizationId), type: 'Custom', url: productUrl,
              ...(clean(req.body?.trackingId, 100) ? { mdasc: clean(req.body.trackingId, 100) } : {})
            });
          } catch (error) {
            skipped.push({ id: clean(product.id, 120), reason: 'Link rastreável não gerado: ' + clean(error?.message, 180) });
            if (Number(error?.status) === 403) break;
            continue;
          }
          const linkRows = Array.isArray(shortResponse) ? shortResponse : listFrom(shortResponse);
          const affiliateUrl = linkRows.flatMap(x => Array.isArray(x.shortUrls) ? x.shortUrls : []).find(v => typeof v === 'string' && /^https:\/\//i.test(v));
          if (!affiliateUrl) { skipped.push({ id: clean(product.id, 120), reason: 'A Lomadee não retornou um link HTTPS rastreável.' }); continue; }
          const fp = await fingerprint({ source: 'LOMADEE', externalId: clean(product.id, 120), productUrl, title });
          const discount = Math.round((originalPrice - currentPrice) * 100 / originalPrice);
          const currentReais = Math.round(currentPrice), originalReais = Math.round(originalPrice);
          const score = offerScore({ title, currentPrice: currentReais, originalPrice: originalReais });
          const message = promoMessage({ title, source: 'LOMADEE', currentPrice: currentReais, originalPrice: originalReais, affiliateUrl, imageUrl, productUrl });
          const inserted = await db.query(
            "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible) VALUES($1,$2,$3,'LOMADEE',$4,$5,NULL,$6,$7,$8,NULL,NULL,$9,$10,'APPROVED',$11,$12,'VALIDATED','AUTO',false) ON CONFLICT DO NOTHING RETURNING id",
            [crypto.randomUUID(), account.id, title, originalReais, currentReais, affiliateUrl, imageUrl, productUrl, discount, score, message, fp]
          );
          if (inserted.rows.length) imported.push({ id: inserted.rows[0].id, title, currentPrice: currentReais / 100, originalPrice: originalReais / 100, discount, affiliateUrl });
          else skipped.push({ id: clean(product.id, 120), reason: 'Duplicada; não foi inserida novamente.' });
        }
        let autopilot = null;
        if (imported.length) {
          try { autopilot = await scheduler.now('/api/jobs/autopilot'); }
          catch (error) { console.error('lomadee autopilot trigger failed', String(error?.code || error?.name || 'ERROR').slice(0, 60)); }
        }
        return res.json({ ok: true, imported: imported.length, skipped: skipped.length, items: imported, skippedItems: skipped, autopilotTriggered: Boolean(autopilot), note: 'Somente produtos disponíveis, com desconto verificável, imagem e link rastreável foram aprovados. A publicação depende das regras ativas, destino Telegram e limites configurados.' });
      }
      return res.status(400).json({ error: 'Ação não suportada. Use validate ou import_products.' });
    }

    if (req.method === 'GET') {
      if (!['products','campaigns','brands','channels'].includes(resource)) return res.status(400).json({ error: 'Recurso somente leitura não suportado.' });
      const limit = Math.min(resource === 'products' ? 100 : 20, Math.max(1, Math.floor(Number(req.query?.limit) || 10)));
      const params = { page: Math.max(1, Math.floor(Number(req.query?.page) || 1)), limit };
      if (resource === 'products') { if (req.query?.search) params.search = clean(req.query.search, 100); params.isAvailable = true; }
      if (resource === 'campaigns') { params.status = clean(req.query?.status || 'onTime', 40); if (req.query?.types) params.types = clean(req.query.types, 80); }
      const body = await apiRequest('/affiliate/' + resource, apiKey, params);
      const rows = safeRows(resource, body);
      return res.json({ resource, items: rows, count: rows.length, total: Number(body?.count ?? body?.meta?.total ?? body?.pagination?.total ?? rows.length), readOnly: true });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('integrations/lomadee', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(500).json({ error: 'Não foi possível acessar a integração Lomadee.' });
  }
}