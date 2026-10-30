import { config, db } from 'hatchable';
import { fingerprint, offerScore } from 'lib/automation.js';
import { classifyProduct } from 'lib/category-classifier.js';
import { isMedicationProduct } from 'lib/product-safety.js';
import { formatPromo } from 'lib/promo-message.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

const API_BASE = 'https://creatorsapi.amazon/catalog/v1/';
const TOKEN_ENDPOINTS = {
  '3.1': 'https://api.amazon.com/auth/o2/token',
  '3.2': 'https://api.amazon.co.uk/auth/o2/token',
  '3.3': 'https://api.amazon.co.jp/auth/o2/token'
};
const OPERATIONS = new Set(['searchItems', 'getItems', 'getVariations', 'getBrowseNodes']);
const ALLOWED_MARKETPLACES = new Set(['www.amazon.com.br','www.amazon.com','www.amazon.ca','www.amazon.com.mx','www.amazon.co.uk','www.amazon.de','www.amazon.fr','www.amazon.it','www.amazon.es','www.amazon.nl','www.amazon.com.be','www.amazon.eg','www.amazon.in','www.amazon.ie','www.amazon.pl','www.amazon.sa','www.amazon.se','www.amazon.com.tr','www.amazon.ae','www.amazon.co.jp','www.amazon.sg','www.amazon.com.au']);
const tokenCache = new Map();
const DEFAULT_RESOURCES = [
  'images.primary.medium',
  'itemInfo.title',
  'itemInfo.byLineInfo',
  'itemInfo.features',
  'offersV2.listings.price'
];
const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function getAccount(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
async function getCredentials(accountId) {
  const row = (await db.query(
    "SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='AMAZON' LIMIT 1",
    [accountId]
  )).rows[0];
  if (!row) return null;
  const master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw Object.assign(new Error('Configure CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|AMAZON'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return { credentials: JSON.parse(new TextDecoder().decode(plain)), status: row.status };
}
function credentialsFor(c) {
  const version = clean(c.version || '3.1', 10);
  const clientId = clean(c.clientId, 500);
  const clientSecret = clean(c.clientSecret, 4096);
  const partnerTag = clean(c.affiliateId, 200);
  const marketplace = clean(c.marketplace || 'www.amazon.com.br', 100).toLowerCase();
  if (!clientId || !clientSecret || !partnerTag) {
    throw Object.assign(new Error('Cadastre Credential ID, Credential Secret e Partner Tag da Amazon Creators API.'), { status: 412 });
  }
  if (!TOKEN_ENDPOINTS[version]) throw Object.assign(new Error('Versão de credencial inválida. Use a versão informada pela Amazon (3.1, 3.2 ou 3.3).'), { status: 400 });
  if (!ALLOWED_MARKETPLACES.has(marketplace)) {
    throw Object.assign(new Error('Marketplace inválido. Informe um domínio oficial como www.amazon.com.br.'), { status: 400 });
  }
  return { version, clientId, clientSecret, partnerTag, marketplace };
}
async function getAccessToken(c) {
  const cacheKey = c.version + '|' + c.clientId;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60000) return cached.token;
  const response = await fetch(TOKEN_ENDPOINTS[c.version], {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: c.clientId,
      client_secret: c.clientSecret,
      scope: 'creatorsapi::default'
    }),
    signal: AbortSignal.timeout(10000)
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok || !body.access_token) {
    const status = response.status === 401 || response.status === 403 ? 502 : response.status || 502;
    throw Object.assign(new Error('A Amazon não autorizou a autenticação Creators API (HTTP ' + status + '). Confira Credential ID, Secret, versão e habilitação da conta.'), { status });
  }
  const ttl = Math.max(60, Math.min(3600, Number(body.expires_in) || 3600));
  tokenCache.set(cacheKey, { token: body.access_token, expiresAt: Date.now() + ttl * 1000 });
  return body.access_token;
}
async function amazonRequest(c, operation, payload) {
  if (!OPERATIONS.has(operation)) throw Object.assign(new Error('Operação Creators API não suportada.'), { status: 400 });
  const token = await getAccessToken(c);
  const response = await fetch(API_BASE + operation, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + token,
      'content-type': 'application/json',
      accept: 'application/json',
      'x-marketplace': c.marketplace
    },
    body: JSON.stringify({ ...payload, marketplace: c.marketplace, partnerTag: c.partnerTag }),
    signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('A Amazon retornou uma resposta não JSON.'), { status: 502 }); }
  if (!response.ok || (Array.isArray(body.errors) && body.errors.length)) {
    const code = clean(body?.errors?.[0]?.code || body?.errors?.[0]?.message || '', 80);
    throw Object.assign(new Error('Creators API recusou a consulta (HTTP ' + response.status + (code ? ', código ' + code : '') + '). Confira permissões, marketplace e limites da API.'), { status: response.status >= 400 && response.status < 500 ? response.status : 502 });
  }
  return body;
}
function buildRequest(action, input) {
  const resources = DEFAULT_RESOURCES;
  if (action === 'test') return { operation: 'searchItems', payload: { keywords: 'livro', searchIndex: 'All', itemCount: 1, itemPage: 1, resources: ['itemInfo.title'] } };
  if (action === 'search' || action === 'import') {
    const keywords = clean(input.keyword, 120);
    if (!keywords) throw Object.assign(new Error('Informe uma palavra-chave para buscar produtos.'), { status: 400 });
    const count = Math.min(10, Math.max(1, Math.floor(Number(input.itemCount) || 10)));
    const page = Math.min(10, Math.max(1, Math.floor(Number(input.itemPage) || 1)));
    const searchIndex = clean(input.searchIndex || 'All', 80);
    const payload = { keywords, searchIndex, itemCount: count, itemPage: page, resources };
    const brand = clean(input.brand, 100);
    if (brand) payload.brand = brand;
    const minPrice = Number(input.minPrice);
    const maxPrice = Number(input.maxPrice);
    if (Number.isFinite(minPrice) && minPrice > 0 && Number.isFinite(maxPrice) && maxPrice > 0 && maxPrice < minPrice) throw Object.assign(new Error('O preço máximo não pode ser menor que o mínimo.'), { status: 400 });
    if (Number.isFinite(minPrice) && minPrice > 0) payload.minPrice = Math.floor(minPrice * 100);
    if (Number.isFinite(maxPrice) && maxPrice > 0) payload.maxPrice = Math.floor(maxPrice * 100);
    return { operation: 'searchItems', payload };
  }
  if (action === 'items') {
    const ids = String(input.asins || '').split(/[\s,;]+/).map(x => x.trim()).filter(Boolean).slice(0, 10);
    if (!ids.length || ids.some(x => !/^[A-Z0-9]{10}$/i.test(x))) throw Object.assign(new Error('Informe de 1 a 10 ASINs válidos, com 10 caracteres alfanuméricos cada.'), { status: 400 });
    return { operation: 'getItems', payload: { itemIds: ids, itemIdType: 'ASIN', resources } };
  }
  if (action === 'variations') {
    const asin = clean(input.asin, 20).toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(asin)) throw Object.assign(new Error('Informe um ASIN válido com 10 caracteres.'), { status: 400 });
    return { operation: 'getVariations', payload: { asin, variationCount: Math.min(10, Math.max(1, Math.floor(Number(input.variationCount) || 10))), variationPage: Math.min(100, Math.max(1, Math.floor(Number(input.variationPage) || 1))), resources } };
  }
  if (action === 'browseNodes') {
    const ids = String(input.browseNodeIds || '').split(/[\s,;]+/).map(x => x.trim()).filter(Boolean).slice(0, 10);
    if (!ids.length || ids.some(x => !/^\d{1,19}$/.test(x) || BigInt(x) <= 0n)) throw Object.assign(new Error('Informe de 1 a 10 IDs numéricos positivos de categorias Amazon.'), { status: 400 });
    return { operation: 'getBrowseNodes', payload: { browseNodeIds: ids, resources: ['browseNodes.ancestor', 'browseNodes.children'] } };
  }
  throw Object.assign(new Error('Ação Amazon não suportada.'), { status: 400 });
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Amazon.' });
  try {
    const account = await getAccount(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    const saved = await getCredentials(account.id);
    if (!saved) return res.status(412).json({ error: 'Cadastre as credenciais da Amazon Creators API antes de executar consultas.' });
    const c = credentialsFor(saved.credentials);
    if (req.method === 'GET') {
      const action = clean(req.query?.action || 'status', 30);
      if (action === 'status') return res.json({
        status: saved.status,
        marketplace: c.marketplace,
        capabilities: ['searchItems', 'getItems', 'getVariations', 'getBrowseNodes', 'affiliate_detail_page_links'],
        unsupported: ['create_short_links', 'publish_offers', 'earnings_reports'],
        note: 'Os links de afiliado são os detailPageURL retornados pela Creators API com Partner Tag. A API de catálogo não publica em canais. Relatórios de rendimentos não fazem parte das quatro operações de catálogo validadas neste fluxo.'
      });
      return res.status(400).json({ error: 'Use POST para executar uma consulta.' });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const action = clean(req.body?.action || '', 30);
    const { operation, payload } = buildRequest(action, req.body || {});
    const result = await amazonRequest(c, operation, payload);
    await db.query(
      "UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='AMAZON'",
      [account.id]
    );
    return res.json({ ok: true, status: 'VALIDATED', operation, result, readOnly: true, published: false });
  } catch (error) {
    const status = Number(error?.status) || 502;
    if (req.member && (status >= 500 || status === 401 || status === 403)) {
      try {
        const account = await getAccount(req.member);
        if (account) await db.query(
          "UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='AMAZON'",
          [account.id, String(error?.message || 'Falha de validação').slice(0, 220)]
        );
      } catch {}
    }
    console.error('integrations/amazon', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60), status }));
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: error?.message || 'Não foi possível acessar a Amazon Creators API.' });
  }
}