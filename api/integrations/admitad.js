import { config, db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST'];

const BASE = 'https://api.admitad.com';
const clean = (v, n = 300) => String(v ?? '').trim().slice(0, n);
const fromB64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));

async function accountFor(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
async function encryptionKey(accountId) {
  const master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw Object.assign(new Error('Configure CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|ADMITAD'));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function credentialsFor(accountId) {
  const row = (await db.query("SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='ADMITAD' LIMIT 1", [accountId])).rows[0];
  if (!row) return null;
  const key = await encryptionKey(accountId);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return { credentials: JSON.parse(new TextDecoder().decode(plain)), status: row.status };
}
async function persistCredentials(accountId, credentials) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(accountId);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(JSON.stringify(credentials)));
  await db.query("UPDATE marketplace_api_credentials SET credentials_enc=$2,nonce=$3,updated_at=now() WHERE account_id=$1 AND marketplace='ADMITAD'", [accountId, toB64(encrypted), toB64(nonce)]);
}
async function accessToken(accountId, credentials) {
  const clientId = clean(credentials.clientId, 300);
  const clientSecret = clean(credentials.clientSecret, 4096);
  if (!clientId || !clientSecret) throw Object.assign(new Error('Cadastre Client ID e Client Secret oficiais da Admitad.'), { status: 412 });
  if (credentials.accessToken && Number(credentials.tokenExpiresAt) > Date.now() + 60000) return credentials.accessToken;
  const form = new URLSearchParams();
  form.set('client_id', clientId);
  let headers = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
  if (credentials.refreshToken) {
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', clean(credentials.refreshToken, 4096));
    form.set('client_secret', clientSecret);
  } else {
    form.set('grant_type', 'client_credentials');
    form.set('scope', 'advcampaigns deeplink_generator websites');
    headers.authorization = 'Basic ' + btoa(clientId + ':' + clientSecret);
  }
  const response = await fetch(BASE + '/token/', { method: 'POST', headers, body: form.toString(), signal: AbortSignal.timeout(12000) });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok || !data.access_token) throw Object.assign(new Error('A Admitad não autorizou a API (HTTP ' + response.status + '). Confira Client ID, Client Secret e escopos habilitados.'), { status: response.status === 401 || response.status === 403 ? 502 : 502 });
  credentials.accessToken = clean(data.access_token, 4096);
  credentials.refreshToken = clean(data.refresh_token || credentials.refreshToken, 4096);
  credentials.tokenExpiresAt = Date.now() + Math.max(60, Math.min(7 * 86400, Number(data.expires_in) || 604800)) * 1000;
  await persistCredentials(accountId, credentials);
  return credentials.accessToken;
}
async function apiRequest(path, token, options = {}) {
  const response = await fetch(BASE + path, {
    method: options.method || 'GET',
    headers: { authorization: 'Bearer ' + token, accept: 'application/json', ...(options.body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body: options.body ? options.body.toString() : undefined,
    signal: AbortSignal.timeout(options.timeout || 15000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('A Admitad retornou uma resposta JSON inválida.'), { status: 502 }); }
  if (!response.ok) throw Object.assign(new Error('A Admitad recusou a operação (HTTP ' + response.status + '). Confira website ID, campanha e escopos autorizados.'), { status: response.status === 401 || response.status === 403 ? 502 : response.status >= 400 && response.status < 500 ? response.status : 502 });
  return data;
}
function normalizeCampaign(c) {
  return {
    id: String(c.id ?? ''),
    name: clean(c.name, 180),
    status: clean(c.status, 40),
    connectionStatus: clean(c.connection_status, 40),
    siteUrl: /^https?:\/\//i.test(c.site_url || '') ? clean(c.site_url, 1000) : '',
    currency: clean(c.currency, 3),
    rating: c.rating == null ? null : Number(c.rating),
    ecpc: c.ecpc == null ? null : Number(c.ecpc),
    epc: c.epc == null ? null : Number(c.epc),
    allowDeeplink: Boolean(c.allow_deeplink),
    productsAvailable: Boolean(c.show_products_links),
    regions: Array.isArray(c.regions) ? c.regions.slice(0, 30).map(r => clean(r.region, 3)).filter(Boolean) : []
  };
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Admitad.' });
  try {
    const account = await accountFor(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    const saved = await credentialsFor(account.id);
    if (req.method === 'GET') return res.json({
      provider: 'ADMITAD',
      status: saved?.status || 'NOT_CONFIGURED',
      capabilities: ['affiliate_campaigns', 'website_campaigns', 'automatic_token_refresh', 'affiliate_deeplinks'],
      apiDocumentation: 'https://developers.mitgo.com/hc/en-us/articles/34481290690834-Introduction',
      publicationEnabled: false,
      note: 'Client credentials e tokens são criptografados. O token é renovado com refresh_token; o Website ID deve pertencer à sua conta.'
    });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (!saved) return res.status(412).json({ error: 'Cadastre Client ID, Client Secret e Website ID da Admitad.' });
    const credentials = saved.credentials || {};
    const websiteId = clean(credentials.affiliateId || credentials.accountId, 20);
    if (!/^\d{1,20}$/.test(websiteId)) throw Object.assign(new Error('Informe o Website ID numérico da sua plataforma Admitad.'), { status: 412 });
    const token = await accessToken(account.id, credentials);
    const body = req.body || {};
    const action = clean(body.action || 'test', 30).toLowerCase();
    if (action === 'test' || action === 'campaigns') {
      const limit = Math.min(50, Math.max(1, Math.floor(Number(body.limit) || (action === 'test' ? 1 : 20))));
      const offset = Math.min(100000, Math.max(0, Math.floor(Number(body.offset) || 0)));
      const query = new URLSearchParams({ limit: String(action === 'test' ? 1 : limit), offset: String(offset) });
      if (body.hasTool === 'deeplink' || body.hasTool === 'products' || body.hasTool === 'coupons') query.set('has_tool', String(body.hasTool));
      const data = await apiRequest('/advcampaigns/website/' + websiteId + '/?' + query.toString(), token);
      const results = Array.isArray(data.results) ? data.results : [];
      if (action === 'test') await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='ADMITAD'", [account.id]);
      return res.json({
        provider: 'ADMITAD',
        status: action === 'test' ? 'VALIDATED' : saved.status,
        websiteId,
        count: results.length,
        total: Number(data?._meta?.count) || results.length,
        offset: Number(data?._meta?.offset) || offset,
        campaigns: results.map(normalizeCampaign),
        publicationEnabled: false,
        note: 'Consulta somente leitura. URLs de feed contendo credenciais nunca são retornadas.'
      });
    }
    if (action === 'deeplink') {
      const campaignId = clean(body.campaignId, 20);
      const target = clean(body.productUrl, 2000);
      let parsed;
      try { parsed = new URL(target); } catch { return res.status(400).json({ error: 'Informe uma URL de produto válida.' }); }
      if (!/^\d{1,20}$/.test(campaignId) || parsed.protocol !== 'https:' || parsed.username || parsed.password) return res.status(400).json({ error: 'Use ID numérico de campanha e URL HTTPS sem credenciais.' });
      const query = new URLSearchParams({ ulp: parsed.toString() });
      for (const key of ['subid','subid1','subid2','subid3','subid4']) {
        const value = clean(body[key] || (key === 'subid' ? body.subId : ''), key === 'subid4' ? 120 : 50);
        if (value) {
          if (value.includes('%00')) return res.status(400).json({ error: 'SubID inválido.' });
          query.set(key, value);
        }
      }
      const data = await apiRequest('/deeplink/' + websiteId + '/advcampaign/' + campaignId + '/?' + query.toString(), token);
      const links = (Array.isArray(data) ? data : []).map(item => ({
        link: /^https:\/\/(?:ad\.admitad\.com|[^/]+\.admitad\.com|fas\.st)\//i.test(item.link || '') ? clean(item.link, 2000) : '',
        isAffiliateProduct: item.is_affiliate_product == null ? null : Boolean(item.is_affiliate_product)
      })).filter(item => item.link);
      if (!links.length) throw Object.assign(new Error('A Admitad não retornou deeplink HTTPS válido. Confira a campanha, o Website ID e a permissão deeplink_generator.'), { status: 502 });
      return res.json({ provider: 'ADMITAD', websiteId, campaignId, links, publicationEnabled: false, note: 'Deeplink gerado; nenhuma oferta foi publicada.' });
    }
    return res.status(400).json({ error: 'Ação inválida. Use test, campaigns ou deeplink.' });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('integrations/admitad', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(500).json({ error: 'Não foi possível consultar a Admitad. Confira as credenciais e escopos.' });
  }
}