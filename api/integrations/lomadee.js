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
  if (!['/affiliate/products','/affiliate/brands','/affiliate/campaigns','/affiliate/channels','/affiliate/orders','/affiliate/shortener/url','/affiliate/shortener/urls'].includes(path) && !(path.startsWith('/affiliate/brands/') && path.slice('/affiliate/brands/'.length).length > 0 && !path.slice('/affiliate/brands/'.length).includes('/')) && !(path.startsWith('/affiliate/orders/') && path.slice('/affiliate/orders/'.length).length > 0 && !path.slice('/affiliate/orders/'.length).includes('/')) && !(path.startsWith('/affiliate/channels/') && path.slice('/affiliate/channels/'.length).length > 0 && !path.slice('/affiliate/channels/'.length).includes('/')) && !(path.startsWith('/affiliate/campaigns/') && path.slice('/affiliate/campaigns/'.length).length > 0 && !path.slice('/affiliate/campaigns/'.length).includes('/')) && !(path.startsWith('/affiliate/shortener/urls/') && path.slice('/affiliate/shortener/urls/'.length).length > 0 && !path.slice('/affiliate/shortener/urls/'.length).includes('/'))) {
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
  if (resource === 'shortener' && body?.data && !Array.isArray(body.data) && typeof body.data === 'object') {
    const x = body.data;
    return [{ originalUrl: typeof x.originalUrl === 'string' && /^https:\/\//i.test(x.originalUrl) ? x.originalUrl.slice(0, 2000) : '', shortUrl: typeof x.shortUrl === 'string' && /^https:\/\//i.test(x.shortUrl) ? x.shortUrl.slice(0, 2000) : '', urlCode: clean(x.urlCode, 120), organizationId: clean(x.organizationId, 120), active: typeof x.active === 'boolean' ? x.active : null, count: Number.isFinite(Number(x.count)) ? Number(x.count) : null, linkType: clean(x.linkType, 40) }];
  }
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
    active: typeof x.active === 'boolean' ? x.active : null,
    createdAt: clean(x.createdAt, 50),
    type: clean(x.availableChannel?.name || x.type, 100)
  }));
  if (resource === 'shortener') return rows.map(x => ({
    originalUrl: typeof x.originalUrl === 'string' && /^https:\/\//i.test(x.originalUrl) ? x.originalUrl.slice(0, 2000) : '',
    shortUrl: typeof x.shortUrl === 'string' && /^https:\/\//i.test(x.shortUrl) ? x.shortUrl.slice(0, 2000) : '',
    urlCode: clean(x.urlCode, 120), organizationId: clean(x.organizationId, 120),
    active: typeof x.active === 'boolean' ? x.active : null,
    count: Number.isFinite(Number(x.count)) ? Number(x.count) : null,
    linkType: clean(x.linkType || x.type, 40)
  }));
  if (resource === 'orders') return rows.map(row => {
    const x = row?.data && typeof row.data === 'object' ? row.data : row;
    const items = Array.isArray(x.items) ? x.items : Array.isArray(x['items  ']) ? x['items  '] : [];
    return {
      id: clean(x.id, 120), orderId: clean(x.orderId || x.id, 120),
      status: clean(x.status, 40), value: Number.isFinite(Number(x.value)) ? Number(x.value) : null,
      createdAt: clean(x.createdAt, 60), commission: Number.isFinite(Number(x.commission)) ? Number(x.commission) : null,
      commissionStatus: clean(x.commissionStatus, 40), organizationId: clean(x.organizationId, 120),
      mdasc: clean(x.mdasc, 120), items: items.slice(0, 50).map(item => ({
        id: clean(item.id, 120), name: clean(item.name, 220),
        quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : null,
        price: Number.isFinite(Number(item.price)) ? Number(item.price) : null
      }))
    };
  });
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
      publicationEnabled: false,
      linkGenerationStatus: 'NOT_VERIFIED',
      capabilities: ['products:read','campaigns:read','brands:read','channels:read','orders:read','shortener:read'],
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
          const [products, campaigns, channels, orders, shortenedUrls] = await Promise.all([
            apiRequest('/affiliate/products', apiKey, { page: 1, limit: 1 }),
            apiRequest('/affiliate/campaigns', apiKey, { page: 1, limit: 1, status: 'onTime' }),
            apiRequest('/affiliate/channels', apiKey, {}),
            apiRequest('/affiliate/orders', apiKey, { page: 1, limit: 1 }),
            apiRequest('/affiliate/shortener/urls', apiKey, { page: 1, limit: 1, active: true })
          ]);
          await db.query(
            "UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'",
            [account.id]
          );
          return res.json({ ok: true, status: 'VALIDATED', validationScope: 'READ_ONLY', linkGenerationStatus: 'NOT_TESTED', publicationEnabled: false, checks: { products: listFrom(products).length, campaigns: listFrom(campaigns).length, channels: listFrom(channels).length, orders: listFrom(orders).length, shortenedUrls: listFrom(shortenedUrls).length }, capabilities: ['products:read','campaigns:read','brands:read','channels:read','orders:read','shortener:read'], note: 'Autenticação e consultas somente leitura validadas. A permissão de escrita ainda não foi confirmada; nenhuma oferta foi publicada.' });
        } catch (error) {
          const code = Number(error?.status) || 0;
          await db.query(
            "UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'",
            [account.id, code ? 'Consulta oficial falhou (HTTP ' + code + '). Verifique escopos da chave.' : 'Falha de conexão ou tempo limite na API oficial.']
          );
          return res.status(code === 401 || code === 403 ? code : 502).json({ error: error?.message || 'Não foi possível alcançar a API oficial da Lomadee.', status: 'ERROR' });
        }
      }
      if (action === 'shorten_url') {
        if (saved.status !== 'VALIDATED') return res.status(412).json({ error: 'Valide a conexão Lomadee antes de gerar links.' });
        const organizationId = clean(req.body?.organizationId, 80);
        const type = clean(req.body?.type, 30);
        const featureId = clean(req.body?.featureId, 120);
        const rawUrl = clean(req.body?.url, 2000);
        const mdasc = clean(req.body?.mdasc, 100);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) return res.status(400).json({ error: 'organizationId deve ser um UUID válido da marca Lomadee.' });
        if (!['Coupon','Offer','BrandPage','Custom','Home'].includes(type)) return res.status(400).json({ error: 'type deve ser Coupon, Offer, BrandPage, Custom ou Home.' });
        if (['Coupon','Offer'].includes(type) && !/^[A-Za-z0-9_-]{1,120}$/.test(featureId)) return res.status(400).json({ error: 'Coupon e Offer exigem featureId válido da campanha Lomadee.' });
        if (!['Coupon','Offer'].includes(type) && featureId) return res.status(400).json({ error: 'featureId só pode ser enviado para Coupon ou Offer.' });
        if (type === 'Custom') {
          let parsed;
          try { parsed = new URL(rawUrl); } catch { parsed = null; }
          if (!parsed || parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return res.status(400).json({ error: 'Custom exige uma URL HTTPS válida, sem usuário ou senha embutidos.' });
        } else if (rawUrl) return res.status(400).json({ error: 'url só pode ser enviado quando type=Custom.' });
        const payload = { organizationId, type, ...(featureId ? { featureId } : {}), ...(type === 'Custom' ? { url: rawUrl } : {}), ...(mdasc ? { mdasc } : {}) };
        const body = await apiRequest('/affiliate/shortener/url', apiKey, {}, 'POST', payload);
        const rows = (Array.isArray(body) ? body : listFrom(body)).map(row => ({
          id: clean(row?.id, 120), name: clean(row?.name, 200),
          availableChannel: { id: clean(row?.availableChannel?.id, 120), name: clean(row?.availableChannel?.name, 200) },
          shortUrls: (Array.isArray(row?.shortUrls) ? row.shortUrls : []).filter(url => typeof url === 'string' && /^https:\/\//i.test(url)).map(url => url.slice(0, 2000)),
          message: clean(row?.message, 300)
        }));
        const generatedCount = rows.reduce((sum, row) => sum + row.shortUrls.length, 0);
        const approvalRequired = generatedCount === 0 && rows.some(row => /organization approval is required/i.test(row.message || ''));
        const channelNotAllowed = generatedCount === 0 && rows.some(row => /channel is not allowed by the organization/i.test(row.message || ''));
        const noLinkGenerated = generatedCount === 0 && !approvalRequired && !channelNotAllowed;
        const httpStatus = approvalRequired || channelNotAllowed ? 409 : noLinkGenerated ? 502 : 200;
        const linkStatus = approvalRequired ? 'APPROVAL_REQUIRED' : channelNotAllowed ? 'CHANNEL_NOT_ALLOWED' : generatedCount > 0 ? 'CREATED' : 'NO_LINK_GENERATED';
        const linkError = approvalRequired
          ? `A Lomadee exige aprovação comercial para a organização/anunciante ${organizationId}. Nenhum link foi criado.`
          : channelNotAllowed
            ? 'A organização não permite o canal de afiliado cadastrado para esta campanha. Nenhum link foi criado; use apenas um canal autorizado pela Lomadee.'
            : noLinkGenerated
              ? 'A Lomadee não retornou nenhum link rastreável. Nenhum link foi criado; verifique a resposta por canal e as permissões da organização.'
              : '';
        return res.status(httpStatus).json({ ok: generatedCount > 0, status: linkStatus, resource: 'shortener', type, organizationId, channels: rows, generatedCount, created: generatedCount > 0, published: false, ...(linkError ? { error: linkError } : {}) });
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
      if (!['products','campaigns','brands','channels','orders','shortener'].includes(resource)) return res.status(400).json({ error: 'Recurso somente leitura não suportado.' });
      const limit = Math.min(resource === 'products' || resource === 'orders' || resource === 'shortener' ? 100 : 20, Math.max(1, Math.floor(Number(req.query?.limit) || 10)));
      const params = { page: Math.max(1, Math.floor(Number(req.query?.page) || 1)), limit };
      if (resource === 'products') {
        if (req.query?.search) params.search = clean(req.query.search, 100);
        if (req.query?.price !== undefined && req.query?.price !== '') {
          const price = clean(req.query.price, 40);
          const match = price.match(/^([0-9]+):([0-9]+)$/);
          if (!match || Number(match[1]) > Number(match[2])) return res.status(400).json({ error: 'price deve seguir o formato min:max em centavos, com mínimo menor ou igual ao máximo.' });
          params.price = price;
        }
        if (req.query?.organizationIds) {
          const ids = clean(req.query.organizationIds, 1000).split(',').map(x => x.trim());
          if (!ids.length || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return res.status(400).json({ error: 'organizationIds deve conter UUIDs separados por vírgula.' });
          params.organizationIds = ids.join(',');
        }
        if (req.query?.isAvailable !== undefined) {
          const available = String(req.query.isAvailable).toLowerCase();
          if (!['true','false'].includes(available)) return res.status(400).json({ error: 'isAvailable deve ser true ou false.' });
          params.isAvailable = available;
        } else params.isAvailable = true;
      }
      if (resource === 'campaigns') {
        params.status = clean(req.query?.status || 'onTime', 80);
        if (params.status.includes(',')) return res.status(400).json({ error: 'A API Lomadee aceita um status por consulta. Consulte onTime e scheduled separadamente.' });
        if (req.query?.types) params.types = clean(req.query.types, 80);
        if (req.query?.offerType) params.offerType = clean(req.query.offerType, 40);
        if (req.query?.organizationId) params.organizationId = clean(req.query.organizationId, 120);
        if (req.query?.organizationIds) params.organizationIds = clean(req.query.organizationIds, 1000);
        if (req.query?.name) params.name = clean(req.query.name, 180);
        if (req.query?.categories) params.categories = clean(req.query.categories, 500);
        if (req.query?.isHighlight !== undefined) {
          const highlight = String(req.query.isHighlight).toLowerCase();
          if (!['true','false'].includes(highlight)) return res.status(400).json({ error: 'isHighlight deve ser true ou false.' });
          params.isHighlight = highlight;
        }
        if (req.query?.startAt && req.query?.endAt) {
          const startAt = clean(req.query.startAt, 40), endAt = clean(req.query.endAt, 40);
          if (!Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt)) || Date.parse(startAt) > Date.parse(endAt)) return res.status(400).json({ error: 'Informe um período ISO válido: startAt deve ser anterior ou igual a endAt.' });
          params.startAt = startAt; params.endAt = endAt;
        } else if (req.query?.startAt || req.query?.endAt) return res.status(400).json({ error: 'Informe startAt e endAt juntos.' });
      }
      if (resource === 'shortener') {
        if (req.query?.urlCode) {
          const urlCode = clean(req.query.urlCode, 120);
          if (!/^[A-Za-z0-9_-]+$/.test(urlCode)) return res.status(400).json({ error: 'Código da URL encurtada inválido.' });
          const body = await apiRequest('/affiliate/shortener/urls/' + encodeURIComponent(urlCode), apiKey);
          const items = safeRows('shortener', body);
          return res.json({ resource, items, count: items.length, total: items.length, readOnly: true });
        }
        if (req.query?.search) params.search = clean(req.query.search, 200);
        if (req.query?.organizationId) params.organizationId = clean(req.query.organizationId, 120);
        if (req.query?.type) {
          const type = clean(req.query.type, 30);
          if (!['Coupon','BrandPage','Offer','Custom'].includes(type)) return res.status(400).json({ error: 'type deve ser Coupon, BrandPage, Offer ou Custom.' });
          params.type = type;
        }
        if (req.query?.active !== undefined) {
          const active = String(req.query.active).toLowerCase();
          if (!['true','false'].includes(active)) return res.status(400).json({ error: 'active deve ser true ou false.' });
          params.active = active;
        } else params.active = true;
        if (req.query?.startAt && req.query?.endAt) {
          const startAt = clean(req.query.startAt, 40), endAt = clean(req.query.endAt, 40);
          if (!Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt)) || Date.parse(startAt) > Date.parse(endAt)) return res.status(400).json({ error: 'Informe startAt e endAt válidos, com startAt anterior ou igual a endAt.' });
          params.startAt = startAt; params.endAt = endAt;
        } else if (req.query?.startAt || req.query?.endAt) return res.status(400).json({ error: 'Informe startAt e endAt juntos.' });
        const body = await apiRequest('/affiliate/shortener/urls', apiKey, params);
        const items = safeRows('shortener', body);
        return res.json({ resource, items, count: items.length, total: Number(body?.meta?.total) || items.length, page: Number(body?.meta?.page) || params.page, limit: Number(body?.meta?.limit) || limit, totalPages: Number(body?.meta?.totalPages) || (items.length ? 1 : 0), readOnly: true });
      }
      if (resource === 'campaigns' && req.query?.campaignId) {
        const campaignId = clean(req.query.campaignId, 120);
        if (!/^[A-Za-z0-9_-]+$/.test(campaignId)) return res.status(400).json({ error: 'ID da campanha inválido.' });
        const body = await apiRequest('/affiliate/campaigns/' + encodeURIComponent(campaignId), apiKey);
        const rows = safeRows('campaigns', [body?.data || body]);
        return res.json({ resource, items: rows, count: rows.length, total: rows.length, readOnly: true });
      }
      if (resource === 'orders') {
        if (req.query?.organizationId) params.organizationId = clean(req.query.organizationId, 120);
        if (req.query?.organizationIds) params.organizationIds = clean(req.query.organizationIds, 1000);
        if (req.query?.mdasc !== undefined) params.mdasc = String(req.query.mdasc).toLowerCase() === 'true';
        if (req.query?.from && req.query?.to) { params.from = clean(req.query.from, 10); params.to = clean(req.query.to, 10); }
        else if (req.query?.from || req.query?.to) return res.status(400).json({ error: 'Informe from e to juntos no formato YYYY-MM-DD.' });
      }
      if (resource === 'channels' && req.query?.channelId) {
        const channelId = clean(req.query.channelId, 120);
        if (!/^[A-Za-z0-9_-]+$/.test(channelId)) return res.status(400).json({ error: 'ID do canal inválido.' });
        const body = await apiRequest('/affiliate/channels/' + encodeURIComponent(channelId), apiKey);
        const rows = safeRows('channels', [body?.data || body]);
        return res.json({ resource, items: rows, count: rows.length, total: rows.length, readOnly: true });
      }
      if (resource === 'brands' && req.query?.brandId) {
        const brandId = clean(req.query.brandId, 120);
        if (!/^[A-Za-z0-9_-]+$/.test(brandId)) return res.status(400).json({ error: 'ID de marca inválido.' });
        const body = await apiRequest('/affiliate/brands/' + encodeURIComponent(brandId), apiKey);
        const rows = safeRows('brands', [body?.data || body]);
        return res.json({ resource, items: rows, count: rows.length, total: rows.length, readOnly: true });
      }
      if (resource === 'orders' && req.query?.orderId) {
        const orderId = clean(req.query.orderId, 120);
        if (!/^[A-Za-z0-9_-]+$/.test(orderId)) return res.status(400).json({ error: 'ID do pedido inválido.' });
        const body = await apiRequest('/affiliate/orders/' + encodeURIComponent(orderId), apiKey, req.query?.mdasc !== undefined ? { mdasc: String(req.query.mdasc).toLowerCase() === 'true' } : {});
        const rows = safeRows('orders', body?.data && !Array.isArray(body.data) ? [body.data] : body);
        return res.json({ resource, items: rows, count: rows.length, total: rows.length, readOnly: true });
      }
      const body = await apiRequest('/affiliate/' + resource, apiKey, params);
      const rows = safeRows(resource, body);
      return res.json({ resource, items: rows, count: rows.length, total: Number(body?.count ?? body?.meta?.total ?? body?.pagination?.total ?? rows.length), page: Number(body?.meta?.page ?? body?.pagination?.page ?? params.page), totalPages: Number(body?.meta?.totalPages ?? body?.pagination?.totalPages ?? 1), readOnly: true });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('integrations/lomadee', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(500).json({ error: 'Não foi possível acessar a integração Lomadee.' });
  }
}