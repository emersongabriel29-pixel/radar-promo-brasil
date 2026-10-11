import { config, db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST'];

const API_URL = 'https://open-api.affiliate.shopee.com.br/graphql';
const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');

async function getAccount(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}

async function getCredentials(accountId) {
  const row = (await db.query(
    "SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='SHOPEE' LIMIT 1",
    [accountId]
  )).rows[0];
  if (!row) return null;
  const master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw Object.assign(new Error('Configure CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|SHOPEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return { credentials: JSON.parse(new TextDecoder().decode(plain)), status: row.status };
}

async function signedRequest(credentials, payload) {
  const appId = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  if (!appId || !secret) throw Object.assign(new Error('Cadastre App ID e App Secret emitidos pela Open API de Afiliados Shopee.'), { status: 412 });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify(payload);
  const signature = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(appId + timestamp + body + secret)));
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: 'SHA256 Credential=' + appId + ', Timestamp=' + timestamp + ', Signature=' + signature
    },
    body,
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('A API Shopee retornou uma resposta não JSON.'), { status: 502 }); }
  if (!response.ok || (Array.isArray(result.errors) && result.errors.length)) {
    const apiCode = clean(result?.errors?.[0]?.extensions?.code || result?.errors?.[0]?.extensions?.message || '', 60);
    throw Object.assign(new Error('A Shopee recusou a operação (HTTP ' + response.status + (apiCode ? ', código ' + apiCode : '') + '). Confira App ID, App Secret e permissões da Open API.'), { status: 502 });
  }
  return result;
}

function safeOfferRows(kind, result) {
  const root = result?.data?.[kind] || {};
  const nodes = Array.isArray(root.nodes) ? root.nodes : [];
  return {
    items: nodes.map(item => ({
      name: clean(item.productName || item.shopName || item.offerName, 300),
      itemId: clean(item.itemId, 80),
      shopId: clean(item.shopId, 80),
      url: typeof (item.offerLink || item.productLink) === 'string' && /^https:\/\//i.test(item.offerLink || item.productLink) ? String(item.offerLink || item.productLink).slice(0, 2000) : '',
      price: item.priceMin == null ? null : Number(item.priceMin),
      commissionRate: item.commissionRate == null ? null : Number(item.commissionRate),
      sales: item.sales == null ? null : Number(item.sales)
    })),
    pageInfo: root.pageInfo ? {
      page: Number(root.pageInfo.page) || 1,
      limit: Number(root.pageInfo.limit) || nodes.length,
      hasNextPage: Boolean(root.pageInfo.hasNextPage)
    } : null
  };
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Shopee.' });
  try {
    const account = await getAccount(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    if (req.method === 'GET') {
      const saved = await getCredentials(account.id);
      return res.json({
        provider: 'SHOPEE',
        status: saved?.status || 'NOT_CONFIGURED',
        capabilities: ['product_offers', 'shop_offers', 'shopee_campaign_offers', 'affiliate_short_links', 'conversion_reports', 'validated_reports'],
        readOnlyTest: true,
        publicationEnabled: false
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const saved = await getCredentials(account.id);
    if (!saved) return res.status(412).json({ error: 'Cadastre as credenciais da Shopee no painel antes de usar a API.' });
    const credentials = saved.credentials || {};
    const action = clean(req.body?.action, 40).toLowerCase();
    let result;

    if (action === 'test') {
      const payload = {
        query: 'query { productOfferV2(keyword: "phone", sortType: 1, page: 1, limit: 1) { nodes { productName offerLink commissionRate sales } pageInfo { page limit hasNextPage } } }'
      };
      result = await signedRequest(credentials, payload);
      if (!result?.data?.productOfferV2 || result?.errors?.length) throw Object.assign(new Error('A API autenticou, mas a consulta de ofertas não retornou o formato esperado.'), { status: 502 });
      await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'", [account.id]);
      return res.json({ ok: true, status: 'VALIDATED', test: 'read_only_product_offer', itemsReturned: Array.isArray(result.data.productOfferV2.nodes) ? result.data.productOfferV2.nodes.length : 0, publicationEnabled: false, note: 'Autenticação validada por consulta somente leitura. Nenhuma oferta foi publicada e nenhum link foi criado.' });
    }

    if (action === 'offers') {
      const kindMap = { product: 'productOfferV2', shop: 'shopOfferV2', shopee: 'shopeeOfferV2' };
      const kind = kindMap[clean(req.body?.kind, 20).toLowerCase()];
      if (!kind) return res.status(400).json({ error: 'Escolha ofertas de produto, loja ou campanha Shopee.' });
      const keyword = clean(req.body?.keyword || 'phone', 80).replace(/[\\\\"\\r\\n]/g, ' ').trim() || 'phone';
      const limit = Math.min(20, Math.max(1, Math.floor(Number(req.body?.limit) || 10)));
      const page = Math.min(1000, Math.max(1, Math.floor(Number(req.body?.page) || 1)));
      const query = kind === 'productOfferV2'
        ? 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { productName offerLink commissionRate sales } pageInfo { page limit hasNextPage } } }'
        : kind === 'shopOfferV2'
          ? 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { shopOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { shopName shopId offerLink commissionRate } pageInfo { page limit hasNextPage } } }'
          : 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { shopeeOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { offerName offerLink commissionRate } pageInfo { page limit hasNextPage } } }';
      result = await signedRequest(credentials, { query, variables: { keyword, sortType: 1, page, limit } });
      const normalized = safeOfferRows(kind, result);
      return res.json({ kind, ...normalized, readOnly: true, publicationEnabled: false });
    }

    if (action === 'create_link') {
      let origin;
      try { origin = new URL(String(req.body?.originUrl || '')); } catch { return res.status(400).json({ error: 'Informe uma URL de produto ou loja Shopee válida.' }); }
      if (origin.protocol !== 'https:' || !/(^|\\.)shopee\\.com\\.br$/i.test(origin.hostname)) return res.status(400).json({ error: 'O link de origem precisa ser HTTPS e pertencer a shopee.com.br.' });
      const subIds = String(req.body?.subIds || '').split(',').map(value => clean(value, 50)).filter(Boolean).slice(0, 5);
      const escapedUrl = JSON.stringify(origin.toString());
      const escapedSubs = JSON.stringify(subIds);
      const query = 'mutation { generateShortLink(input: { originUrl: ' + escapedUrl + ', subIds: ' + escapedSubs + ' }) { shortLink } }';
      result = await signedRequest(credentials, { query });
      const shortLink = result?.data?.generateShortLink?.shortLink;
      if (typeof shortLink !== 'string' || !/^https:\/\//i.test(shortLink)) throw Object.assign(new Error('A Shopee não retornou um link de afiliado válido.'), { status: 502 });
      return res.json({ shortLink, created: true, published: false, note: 'Link criado pela API oficial, mas não foi publicado em nenhum canal.' });
    }

    if (action === 'conversions') {
      const now = Math.floor(Date.now() / 1000);
      const start = Math.floor(new Date(req.body?.startDate || new Date(Date.now() - 7 * 86400000)).getTime() / 1000);
      const end = Math.floor(new Date(req.body?.endDate || new Date()).getTime() / 1000);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start || end > now + 300 || end - start > 90 * 86400) return res.status(400).json({ error: 'Informe um período válido de até 90 dias, sem datas futuras.' });
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.body?.limit) || 20)));
      const query = 'query { conversionReport(purchaseTimeStart: ' + start + ', purchaseTimeEnd: ' + end + ', limit: ' + limit + ') { nodes { conversionId purchaseTime totalCommission } pageInfo { limit hasNextPage scrollId } } }';
      result = await signedRequest(credentials, { query });
      const root = result?.data?.conversionReport || {};
      return res.json({ report: 'conversionReport', items: Array.isArray(root.nodes) ? root.nodes : [], pageInfo: root.pageInfo || null, readOnly: true });
    }

    if (action === 'validated') {
      const validationId = String(req.body?.validationId || '').trim();
      if (!/^\\d{1,18}$/.test(validationId)) return res.status(400).json({ error: 'Informe o Validation ID numérico exibido no relatório de pagamentos da Shopee.' });
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.body?.limit) || 20)));
      const query = 'query { validatedReport(validationId: ' + validationId + ', limit: ' + limit + ') { nodes { conversionId totalCommission netCommission } pageInfo { limit hasNextPage scrollId } } }';
      result = await signedRequest(credentials, { query });
      const root = result?.data?.validatedReport || {};
      return res.json({ report: 'validatedReport', items: Array.isArray(root.nodes) ? root.nodes : [], pageInfo: root.pageInfo || null, readOnly: true });
    }

    return res.status(400).json({ error: 'Ação Shopee não suportada.' });
  } catch (error) {
    const status = Number(error?.status) || 502;
    if (req.body?.action === 'test') {
      try {
        const account = await getAccount(req.member);
        if (account) await db.query("UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'", [account.id, String(error?.message || 'Falha de validação').slice(0, 220)]);
      } catch {}
    }
    console.error('integrations/shopee', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60), status }));
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: error?.message || 'Não foi possível acessar a API oficial da Shopee.' });
  }
}