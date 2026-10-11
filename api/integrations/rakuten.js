import { config, db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST'];

const BASE = 'https://api.linksynergy.com';
const clean = (v, n = 300) => String(v ?? '').trim().slice(0, n);
const fromB64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const decodeXml = value => String(value || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n) || 0)));
function tag(block, name) {
  const match = String(block || '').match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, '').trim()) : '';
}
async function accountFor(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
async function rakutenKey(accountId, usages) {
  const master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw Object.assign(new Error('Configure CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|RAKUTEN'));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, usages);
}
async function credentialsFor(accountId) {
  const row = (await db.query("SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='RAKUTEN' LIMIT 1", [accountId])).rows[0];
  if (!row) return null;
  const key = await rakutenKey(accountId, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return { credentials: JSON.parse(new TextDecoder().decode(plain)), status: row.status };
}
async function saveCredentials(accountId, credentials, status = 'PENDING_VALIDATION') {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await rakutenKey(accountId, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(JSON.stringify(credentials)));
  const fields = Object.keys(credentials).filter(k => Boolean(credentials[k]));
  const hint = clean(credentials.clientSecret || credentials.accessToken || credentials.refreshToken || '', 4096).slice(-4);
  await db.query("UPDATE marketplace_api_credentials SET credentials_enc=$1,nonce=$2,credential_fields=$3::jsonb,key_last4=$4,status=CASE WHEN status='VALIDATED' THEN 'VALIDATED' ELSE $5 END,last_error='',updated_at=now() WHERE account_id=$6 AND marketplace='RAKUTEN'", [toB64(encrypted), toB64(nonce), JSON.stringify(fields), hint, status, accountId]);
}
async function rakutenTokenRequest(credentials, params) {
  const clientId = clean(credentials.clientId, 500), clientSecret = clean(credentials.clientSecret, 4096), accountId = clean(credentials.accountId, 100);
  if (!clientId || !clientSecret || !accountId) throw Object.assign(new Error('Para renovar automaticamente, cadastre Client ID, Client Secret e Account ID da conta Rakuten.'), { status: 412 });
  const tokenKey = btoa(clientId + ':' + clientSecret);
  const response = await fetch(BASE + '/token', { method: 'POST', headers: { authorization: 'Bearer ' + tokenKey, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams(params).toString(), signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw Object.assign(new Error('A Rakuten não emitiu/renovou o token (HTTP ' + response.status + '). Confira Client ID, Client Secret, Account ID e acesso à API.'), { status: response.status === 401 || response.status === 403 ? 502 : response.status || 502 });
  return data;
}
async function tokenFor(accountId, credentials) {
  const hasOAuthInputs = Boolean(credentials.clientId && credentials.clientSecret && credentials.accountId);
  const expiresAt = Date.parse(credentials.accessTokenExpiresAt || '');
  if (hasOAuthInputs && credentials.refreshToken && (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 120000)) {
    const fresh = await rakutenTokenRequest(credentials, { grant_type: 'refresh_token', refresh_token: clean(credentials.refreshToken, 4096), scope: clean(credentials.accountId, 100) });
    credentials.accessToken = fresh.access_token;
    credentials.refreshToken = fresh.refresh_token || credentials.refreshToken;
    credentials.accessTokenExpiresAt = new Date(Date.now() + Math.max(60, Number(fresh.expires_in) || 3600) * 1000).toISOString();
    await saveCredentials(accountId, credentials);
  } else if (hasOAuthInputs && !credentials.accessToken) {
    const fresh = await rakutenTokenRequest(credentials, { grant_type: 'password', scope: clean(credentials.accountId, 100) });
    credentials.accessToken = fresh.access_token;
    credentials.refreshToken = fresh.refresh_token || '';
    credentials.accessTokenExpiresAt = new Date(Date.now() + Math.max(60, Number(fresh.expires_in) || 3600) * 1000).toISOString();
    await saveCredentials(accountId, credentials);
  }
  const token = clean(credentials.accessToken, 4096);
  if (!token) throw Object.assign(new Error('Cadastre Client ID, Client Secret e Account ID para emitir o token oficial Rakuten, ou informe um Bearer temporário manualmente.'), { status: 412 });
  return token;
}
async function rakutenRequest(path, token, options = {}) {
  const response = await fetch(BASE + path, {
    method: options.method || 'GET',
    headers: { authorization: 'Bearer ' + token, accept: options.accept || 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeout || 12000)
  });
  const raw = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error('A Rakuten recusou a consulta (HTTP ' + response.status + '). Confira o token, a parceria com o anunciante e as permissões da API.'), { status: response.status === 401 || response.status === 403 ? 502 : response.status >= 400 && response.status < 500 ? response.status : 502 });
  }
  return raw;
}
function parseProducts(xml, limit) {
  const items = [];
  const matches = String(xml || '').match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  for (const block of matches.slice(0, limit)) {
    const priceMatch = block.match(/<price\b([^>]*)>([\s\S]*?)<\/price>/i);
    const saleMatch = block.match(/<saleprice\b([^>]*)>([\s\S]*?)<\/saleprice>/i);
    const chosen = saleMatch || priceMatch;
    const currencyMatch = chosen?.[1]?.match(/currency=["']([^"']+)["']/i);
    const productUrl = tag(block, 'linkurl');
    const imageUrl = tag(block, 'imageurl');
    items.push({
      advertiserId: tag(block, 'mid'),
      advertiser: tag(block, 'merchantname'),
      id: tag(block, 'sku') || tag(block, 'linkid'),
      title: tag(block, 'productname'),
      category: tag(block, 'primary'),
      description: tag(block, 'short'),
      price: chosen ? decodeXml(chosen[2].replace(/<[^>]+>/g, '').trim()) : '',
      currency: clean(currencyMatch?.[1] || '', 3),
      productUrl: /^https:\/\//i.test(productUrl) ? clean(productUrl, 2000) : '',
      imageUrl: /^https:\/\//i.test(imageUrl) ? clean(imageUrl, 2000) : '',
      source: 'RAKUTEN_ADVERTISING'
    });
  }
  return items.filter(x => x.title && x.productUrl);
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Rakuten Advertising.' });
  try {
    const account = await accountFor(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    const saved = await credentialsFor(account.id);
    if (req.method === 'GET') return res.json({
      provider: 'RAKUTEN',
      status: saved?.status || 'NOT_CONFIGURED',
      capabilities: ['advertiser_search', 'product_search_xml', 'affiliate_deep_links'],
      apiDocumentation: 'https://developers.rakutenadvertising.com/',
      tokenLifetimeMinutes: 60,
      publicationEnabled: false,
      note: 'Token Bearer emitido no Developer Portal; normalmente expira em 60 minutos e precisa ser renovado. Parcerias e permissões do anunciante são obrigatórias.'
    });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (!saved) return res.status(412).json({ error: 'Cadastre o token Bearer da Rakuten no painel.' });
    const token = await tokenFor(account.id, saved.credentials || {});
    const body = req.body || {};
    const action = clean(body.action || 'test', 30).toLowerCase();
    if (action === 'test' || action === 'advertisers') {
      const limit = Math.min(50, Math.max(1, Math.floor(Number(body.limit) || 10)));
      const query = new URLSearchParams({ limit: String(action === 'test' ? 1 : limit), ships_to: clean(body.countryCode || 'BRA', 3).toUpperCase() });
      const raw = await rakutenRequest('/v2/advertisers?' + query.toString(), token);
      let data;
      try { data = JSON.parse(raw); } catch { throw Object.assign(new Error('A Rakuten retornou uma resposta JSON inválida.'), { status: 502 }); }
      const advertisers = Array.isArray(data) ? data : Array.isArray(data.advertisers) ? data.advertisers : Array.isArray(data.data) ? data.data : [];
      if (action === 'test') await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='RAKUTEN'", [account.id]);
      return res.json({
        provider: 'RAKUTEN',
        status: action === 'test' ? 'VALIDATED' : saved.status,
        count: advertisers.length,
        advertisers: advertisers.slice(0, limit).map(a => ({ id: String(a.id ?? a.advertiser?.id ?? ''), name: clean(a.name || a.advertiser?.name, 180), url: /^https:\/\//i.test(a.url || a.advertiser?.url || '') ? clean(a.url || a.advertiser?.url, 1000) : '', canPartner: Boolean(a.can_partner ?? a.advertiser?.can_partner), deepLinks: Boolean(a.features?.deep_links ?? a.advertiser?.features?.deep_links), productFeed: Boolean(a.features?.product_feed ?? a.advertiser?.features?.product_feed) })),
        publicationEnabled: false,
        note: 'Consulta somente leitura; nenhuma oferta foi publicada.'
      });
    }
    if (action === 'search') {
      const keyword = clean(body.keyword, 100);
      if (!keyword) return res.status(400).json({ error: 'Informe a palavra-chave para pesquisar produtos.' });
      if (/[&=?{}\\()[\];~|$!><*%]/.test(keyword)) return res.status(400).json({ error: 'A palavra-chave contém caracteres não aceitos pela Product Search API da Rakuten.' });
      const limit = Math.min(100, Math.max(1, Math.floor(Number(body.limit) || 20)));
      const page = Math.min(10000, Math.max(1, Math.floor(Number(body.page) || 1)));
      const query = new URLSearchParams({ keyword, max: String(limit), pagenumber: String(page), language: clean(body.language || 'pt_BR', 10) });
      const advertiserId = clean(body.advertiserId, 20);
      if (advertiserId) {
        if (!/^\d{1,20}$/.test(advertiserId)) return res.status(400).json({ error: 'O ID do anunciante precisa ser numérico.' });
        query.set('mid', advertiserId);
      }
      const raw = await rakutenRequest('/productsearch/1.0?' + query.toString(), token, { accept: 'application/xml' });
      const items = parseProducts(raw, limit);
      const total = Number((raw.match(/<TotalMatches>(\d+)<\/TotalMatches>/i) || [])[1]) || items.length;
      return res.json({ provider: 'RAKUTEN', items, count: items.length, totalMatches: total, page, publicationEnabled: false, note: 'Busca de produtos somente leitura. Revise preço e disponibilidade antes de usar uma oferta.' });
    }
    if (action === 'deep_link') {
      const productUrl = clean(body.productUrl, 2000);
      const advertiserId = clean(body.advertiserId, 20);
      const name = clean(body.name || 'Radar Promo Brasil', 100);
      const u1 = clean(body.subId || '', 80);
      let parsed;
      try { parsed = new URL(productUrl); } catch { return res.status(400).json({ error: 'Informe uma URL de produto válida.' }); }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !/^\d{1,20}$/.test(advertiserId)) return res.status(400).json({ error: 'Use URL HTTPS sem credenciais e ID numérico do anunciante.' });
      if (u1 && !/^[A-Za-z0-9_-]{1,80}$/.test(u1)) return res.status(400).json({ error: 'SubID aceita apenas letras, números, hífen e sublinhado.' });
      const payload = { url: parsed.toString(), advertiser_id: Number(advertiserId), name };
      if (u1) payload.u1 = u1;
      const raw = await rakutenRequest('/v1/links/deep_links', token, { method: 'POST', body: payload });
      let data;
      try { data = JSON.parse(raw); } catch { throw Object.assign(new Error('A Rakuten retornou uma resposta inválida ao gerar o deeplink.'), { status: 502 }); }
      const link = data?.advertiser?.deep_link?.deep_link_url || '';
      if (!/^https:\/\//i.test(link)) throw Object.assign(new Error('A Rakuten não retornou um deeplink HTTPS válido.'), { status: 502 });
      return res.json({ provider: 'RAKUTEN', affiliateUrl: clean(link, 2000), advertiserId, subId: u1 || null, publicationEnabled: false, note: 'Link de afiliado gerado; nenhuma oferta foi publicada.' });
    }
    return res.status(400).json({ error: 'Ação inválida. Use test, advertisers, search ou deep_link.' });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) {
      try {
        await db.query("UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$1,updated_at=now() WHERE account_id=$2 AND marketplace='RAKUTEN'", [clean(error?.message || 'Falha na API Rakuten.', 300), account.id]);
      } catch {}
    }
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('integrations/rakuten', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(500).json({ error: 'Não foi possível consultar a Rakuten Advertising. Confira as credenciais e permissões.' });
  }
}