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
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw Object.assign(new Error('Configure API_CREDENTIALS_MASTER_KEY ou CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
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
    throw Object.assign(new Error('A Shopee recusou a operação (HTTP ' + response.status + (apiCode ? ', código ' + apiCode : '') + '). Detalhe: ' + clean(result?.errors?.[0]?.message || 'Confira permissões e parâmetros da Open API.', 220)), { status: 502 });
  }
  return result;
}

function safeOfferRows(kind, result) {
  const root = result?.data?.[kind] || {};
  const nodes = Array.isArray(root.nodes) ? root.nodes : [];
  return {
    items: nodes.map(item => ({
      name: clean(item.productName || item.shopName || item.brandName || item.offerName, 300),
      itemId: clean(item.itemId, 80),
      shopId: clean(item.shopId, 80),
      url: typeof (item.offerLink || item.productLink) === 'string' && /^https:\/\//i.test(item.offerLink || item.productLink) ? String(item.offerLink || item.productLink).slice(0, 2000) : '',
      originalUrl: typeof (item.originalLink || item.productLink) === 'string' && /^https:\/\//i.test(item.originalLink || item.productLink) ? String(item.originalLink || item.productLink).slice(0, 2000) : '',
      price: item.priceMin == null ? null : Number(item.priceMin),
      maxPrice: item.priceMax == null ? null : Number(item.priceMax),
      discountRate: item.priceDiscountRate == null ? null : Number(item.priceDiscountRate),
      imageUrl: typeof item.imageUrl === 'string' && /^https:\/\//i.test(item.imageUrl) ? item.imageUrl.slice(0, 2000) : '',
      commissionRate: item.commissionRate == null ? null : Number(item.commissionRate),
      sellerCommissionRate: item.sellerCommissionRate == null ? null : Number(item.sellerCommissionRate),
      shopeeCommissionRate: item.shopeeCommissionRate == null ? null : Number(item.shopeeCommissionRate),
      estimatedCommission: item.commission == null ? null : Number(item.commission),
      sales: item.sales == null ? null : Number(item.sales),
      rating: item.ratingStar == null ? null : Number(item.ratingStar),
      shopName: clean(item.shopName, 200),
      shopType: item.shopType == null ? null : Number(item.shopType),
      offerType: item.offerType == null ? null : Number(item.offerType),
      categoryId: item.categoryId == null ? null : String(item.categoryId),
      collectionId: item.collectionId == null ? null : String(item.collectionId),
      periodStartTime: item.periodStartTime == null ? null : Number(item.periodStartTime),
      periodEndTime: item.periodEndTime == null ? null : Number(item.periodEndTime),
      remainingBudget: item.remainingBudget == null ? null : Number(item.remainingBudget),
      sellerCommissionCoverageRatio: item.sellerCommCoveRatio == null ? null : Number(item.sellerCommCoveRatio)
    })),
    pageInfo: root.pageInfo ? {
      page: Number(root.pageInfo.page) || 1,
      limit: Number(root.pageInfo.limit) || nodes.length,
      hasNextPage: Boolean(root.pageInfo.hasNextPage),
      scrollId: clean(root.pageInfo.scrollId, 1000) || null
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
        capabilities: ['product_offers', 'shop_offers', 'brand_offers', 'shopee_campaign_offers', 'affiliate_short_links', 'batch_affiliate_links', 'conversion_reports', 'validated_reports', 'catalog_feeds'],
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
        query: 'query { productOfferV2(keyword: "phone", sortType: 1, page: 1, limit: 1) { nodes { itemId shopId shopName shopType productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate sellerCommissionRate shopeeCommissionRate commission sales ratingStar periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }'
      };
      result = await signedRequest(credentials, payload);
      if (!result?.data?.productOfferV2 || result?.errors?.length) throw Object.assign(new Error('A API autenticou, mas a consulta de ofertas não retornou o formato esperado.'), { status: 502 });
      await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'", [account.id]);
      return res.json({ ok: true, status: 'VALIDATED', test: 'read_only_product_offer', itemsReturned: Array.isArray(result.data.productOfferV2.nodes) ? result.data.productOfferV2.nodes.length : 0, publicationEnabled: false, note: 'Autenticação validada por consulta somente leitura. Nenhuma oferta foi publicada e nenhum link foi criado.' });
    }

    if (action === 'offers') {
      const kindMap = { product: 'productOfferV2', shop: 'shopOfferV2', brand: 'brandOffer', shopee: 'shopeeOfferV2' };
      const kind = kindMap[clean(req.body?.kind, 20).toLowerCase()];
      if (!kind) return res.status(400).json({ error: 'Escolha ofertas de produto, loja ou campanha Shopee.' });
      const keyword = clean(req.body?.keyword || 'phone', 80).replace(/[\r\n]/g, ' ').trim() || 'phone';
      // The documented offer endpoints support large pages. Keep the default useful for interactive use,
      // while allowing authorized callers to request up to 500 records per page.
      const limit = Math.min(500, Math.max(1, Math.floor(Number(req.body?.limit) || 50)));
      const page = Math.min(1000, Math.max(1, Math.floor(Number(req.body?.page) || 1)));
      const requestedSort = Math.floor(Number(req.body?.sortType) || (kind === 'productOfferV2' ? 5 : 2));
      const sortType = Math.min(5, Math.max(1, requestedSort));
      const variables = { keyword, sortType, page, limit };
      let query;
      if (kind === 'productOfferV2') {
        const listType = Math.min(2, Math.max(0, Math.floor(Number(req.body?.listType) || 0)));
        const shopId = String(req.body?.shopId || '').trim();
        const itemId = String(req.body?.itemId || '').trim();
        const isAMSOffer = req.body?.isAMSOffer === true || req.body?.isAMSOffer === 'true';
        const isKeySeller = req.body?.isKeySeller === true || req.body?.isKeySeller === 'true';
        query = 'query($keyword: String, $listType: Int, $sortType: Int, $page: Int, $limit: Int, $shopId: Int64, $itemId: Int64, $isAMSOffer: Boolean, $isKeySeller: Boolean) { productOfferV2(keyword: $keyword, listType: $listType, sortType: $sortType, page: $page, limit: $limit, shopId: $shopId, itemId: $itemId, isAMSOffer: $isAMSOffer, isKeySeller: $isKeySeller) { nodes { itemId shopId shopName shopType productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate sellerCommissionRate shopeeCommissionRate commission sales ratingStar periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
        variables.listType = listType;
        if (/^\d+$/.test(shopId)) variables.shopId = Number(shopId);
        if (/^\d+$/.test(itemId)) variables.itemId = Number(itemId);
        if (req.body?.isAMSOffer !== undefined && req.body?.isAMSOffer !== '') variables.isAMSOffer = isAMSOffer;
        if (req.body?.isKeySeller !== undefined && req.body?.isKeySeller !== '') variables.isKeySeller = isKeySeller;
      } else if (kind === 'shopOfferV2') {
        const shopType = Array.isArray(req.body?.shopType) ? req.body.shopType.map(Number).filter(n => [1,2,4].includes(n)) : [];
        const isKeySeller = req.body?.isKeySeller === true || req.body?.isKeySeller === 'true';
        query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int, $shopType: [Int!], $isKeySeller: Boolean) { shopOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit, shopType: $shopType, isKeySeller: $isKeySeller) { nodes { shopName shopId offerLink commissionRate ratingStar shopType imageUrl remainingBudget sellerCommCoveRatio periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
        if (shopType.length) variables.shopType = shopType;
        if (req.body?.isKeySeller !== undefined && req.body?.isKeySeller !== '') variables.isKeySeller = isKeySeller;
      } else if (kind === 'brandOffer') {
        query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { brandOffer(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { brandName offerName offerLink commissionRate } pageInfo { page limit hasNextPage } } }';
      } else {
        query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { shopeeOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { offerName offerLink originalLink imageUrl commissionRate offerType categoryId collectionId periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
      }
      result = await signedRequest(credentials, { query, variables });
      const normalized = safeOfferRows(kind, result);
      return res.json({ kind, ...normalized, readOnly: true, publicationEnabled: false });
    }

    if (action === 'batch_links') {
      const entries = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
      if (!entries.length) return res.status(400).json({ error: 'Envie uma lista de 1 a 20 URLs Shopee para gerar os links.' });
      const defaults = String(req.body?.subIds || '').split(',').map(value => clean(value, 50)).filter(value => /^[a-zA-Z0-9]+$/.test(value)).slice(0, 5);
      const output = [];
      for (const entry of entries) {
        const rawUrl = String(entry?.originUrl || entry?.url || '');
        let origin;
        try { origin = new URL(rawUrl); } catch { output.push({ originUrl: rawUrl.slice(0, 500), error: 'URL inválida.' }); continue; }
        if (origin.protocol !== 'https:' || !(origin.hostname === 'shopee.com.br' || origin.hostname.endsWith('.shopee.com.br'))) {
          output.push({ originUrl: rawUrl.slice(0, 500), error: 'A URL precisa pertencer a shopee.com.br.' }); continue;
        }
        const custom = Array.isArray(entry?.subIds) ? entry.subIds : defaults;
        const subIds = custom.map(value => clean(value, 50)).filter(value => /^[a-zA-Z0-9]+$/.test(value)).slice(0, 5);
        try {
          const query = 'mutation { generateShortLink(input: { originUrl: ' + JSON.stringify(origin.toString()) + ', subIds: ' + JSON.stringify(subIds) + ' }) { shortLink } }';
          const linkResult = await signedRequest(credentials, { query });
          const shortLink = linkResult?.data?.generateShortLink?.shortLink;
          if (typeof shortLink !== 'string' || !shortLink.startsWith('https://')) throw new Error('A Shopee não retornou um link válido.');
          output.push({ originUrl: origin.toString(), shortLink, subIds, created: true });
        } catch (error) {
          output.push({ originUrl: origin.toString(), error: String(error?.message || 'Falha ao gerar link.').slice(0, 220) });
        }
      }
      return res.json({ items: output, requested: entries.length, created: output.filter(item => item.created).length, failed: output.filter(item => !item.created).length, published: false, note: 'Geração em lote feita com a mutation oficial generateShortLink; nenhum link foi publicado.' });
    }

    if (action === 'feeds') {
      const feedMode = clean(req.body?.feedMode, 10).toUpperCase();
      if (feedMode && !['FULL', 'DELTA'].includes(feedMode)) return res.status(400).json({ error: 'feedMode deve ser FULL ou DELTA.' });
      const query = 'query($feedMode: FeedMode) { listItemFeeds(feedMode: $feedMode) { nodes { datafeedId feedMode } } }';
      result = await signedRequest(credentials, { query, variables: feedMode ? { feedMode } : {} });
      const root = result?.data?.listItemFeeds || {};
      return res.json({ report: 'listItemFeeds', items: Array.isArray(root.nodes) ? root.nodes : [], readOnly: true });
    }

    if (action === 'feed_data') {
      const datafeedId = String(req.body?.datafeedId || '').trim();
      if (!/^\d{1,24}$/.test(datafeedId)) return res.status(400).json({ error: 'Informe o datafeedId retornado por listItemFeeds.' });
      const offset = Math.min(1000000, Math.max(0, Math.floor(Number(req.body?.offset) || 0)));
      const limit = Math.min(500, Math.max(1, Math.floor(Number(req.body?.limit) || 100)));
      const query = 'query($datafeedId: Int!, $offset: Int!, $limit: Int!) { getItemFeedData(datafeedId: $datafeedId, offset: $offset, limit: $limit) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax commissionRate sales ratingStar shopId shopName } pageInfo { offset limit hasNextPage } } }';
      result = await signedRequest(credentials, { query, variables: { datafeedId: Number(datafeedId), offset, limit } });
      const root = result?.data?.getItemFeedData || {};
      return res.json({ report: 'getItemFeedData', items: Array.isArray(root.nodes) ? root.nodes : [], pageInfo: root.pageInfo || null, readOnly: true });
    }

    if (action === 'create_link') {
      let origin;
      try { origin = new URL(String(req.body?.originUrl || '')); } catch { return res.status(400).json({ error: 'Informe uma URL de produto ou loja Shopee válida.' }); }
      if (origin.protocol !== 'https:' || !/(^|\.)shopee\.com\.br$/i.test(origin.hostname)) return res.status(400).json({ error: 'O link de origem precisa ser HTTPS e pertencer a shopee.com.br.' });
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
      const startInput = String(req.body?.startDate || '');
      const endInput = String(req.body?.endDate || '');
      const startDate = startInput ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(startInput) ? startInput + 'T00:00:00Z' : startInput) : new Date(Date.now() - 7 * 86400000);
      const endDate = endInput ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(endInput) ? endInput + 'T23:59:59Z' : endInput) : new Date();
      const start = Math.floor(startDate.getTime() / 1000);
      const end = Math.floor(endDate.getTime() / 1000);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start || end > now + 300 || end - start > 90 * 86400) return res.status(400).json({ error: 'Informe um período válido de até 90 dias, sem datas futuras.' });
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.body?.limit) || 20)));
      const scrollId = clean(req.body?.scrollId, 1000);
      const orderStatus = clean(req.body?.orderStatus, 20).toUpperCase();
      const buyerType = clean(req.body?.buyerType, 20).toUpperCase();
      const device = clean(req.body?.device, 10).toUpperCase();
      if (orderStatus && !['UNPAID','PENDING','COMPLETED','CANCELLED'].includes(orderStatus)) return res.status(400).json({ error: 'Status deve ser UNPAID, PENDING, COMPLETED ou CANCELLED.' });
      if (buyerType && !['NEW','EXISTING'].includes(buyerType)) return res.status(400).json({ error: 'Tipo de comprador deve ser NEW ou EXISTING.' });
      if (device && !['APP','WEB'].includes(device)) return res.status(400).json({ error: 'Dispositivo deve ser APP ou WEB.' });
      const query = 'query($start: Int!, $end: Int!, $limit: Int!, $scrollId: String, $orderStatus: String, $buyerType: String, $device: String) { conversionReport(purchaseTimeStart: $start, purchaseTimeEnd: $end, limit: $limit, scrollId: $scrollId, orderStatus: $orderStatus, buyerType: $buyerType, device: $device) { nodes { conversionId clickTime purchaseTime totalCommission sellerCommission shopeeCommissionCapped buyerType device utmContent orders { orderId orderStatus items { itemId itemName shopName itemPrice qty itemTotalCommission attributionType } } } pageInfo { limit hasNextPage scrollId } } }';
      result = await signedRequest(credentials, { query, variables: { start, end, limit, ...(scrollId ? { scrollId } : {}), ...(orderStatus ? { orderStatus } : {}), ...(buyerType ? { buyerType } : {}), ...(device ? { device } : {}) } });
      const root = result?.data?.conversionReport || {};
      return res.json({ report: 'conversionReport', items: Array.isArray(root.nodes) ? root.nodes : [], pageInfo: root.pageInfo || null, readOnly: true, nextScrollId: root.pageInfo?.hasNextPage ? (root.pageInfo.scrollId || null) : null });
    }

    if (action === 'validated') {
      const validationId = String(req.body?.validationId || '').trim();
      if (!/^\d{1,18}$/.test(validationId)) return res.status(400).json({ error: 'Informe o Validation ID numérico exibido no relatório de pagamentos da Shopee.' });
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.body?.limit) || 20)));
      const scrollId = clean(req.body?.scrollId, 1000);
      const query = 'query($validationId: Int!, $limit: Int!, $scrollId: String) { validatedReport(validationId: $validationId, limit: $limit, scrollId: $scrollId) { nodes { conversionId totalCommission netCommission } pageInfo { limit hasNextPage scrollId } } }';
      result = await signedRequest(credentials, { query, variables: { validationId: Number(validationId), limit, ...(scrollId ? { scrollId } : {}) } });
      const root = result?.data?.validatedReport || {};
      return res.json({ report: 'validatedReport', items: Array.isArray(root.nodes) ? root.nodes : [], pageInfo: root.pageInfo || null, readOnly: true, nextScrollId: root.pageInfo?.hasNextPage ? (root.pageInfo.scrollId || null) : null });
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
    const message = String(error?.message || 'Falha sem mensagem').replace(/(?:secret|token|signature|authorization)\s*[:=]\s*\S+/ig, '[redacted]').slice(0, 260);
    const kind = /timeout|timed out|abort/i.test(message) ? 'timeout' :
      /não JSON|nao JSON/i.test(message) ? 'upstream_invalid_json' :
      /recusou a operação|recusou a operacao/i.test(message) ? 'provider_rejection' :
      /Cadastre|Configure/i.test(message) ? 'configuration' : 'request_failure';
    console.error('integrations/shopee', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60), status, kind, message }));
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: error?.message || 'Não foi possível acessar a API oficial da Shopee.' });
  }
}