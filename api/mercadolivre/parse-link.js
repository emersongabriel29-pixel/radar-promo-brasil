import { db } from 'hatchable';
import { meliGet } from 'lib/direct-connectors.js';

export const access = 'member';
export const methods = ['POST'];

const HOSTS = new Set([
  'meli.la',
  'mercadolivre.com.br',
  'www.mercadolivre.com.br',
  'produto.mercadolivre.com.br',
  'mercadolivre.com',
  'www.mercadolivre.com',
  'mercadolibre.com',
  'www.mercadolibre.com',
  'mercadolibre.com.br',
  'www.mercadolibre.com.br'
]);
const allowedHost = host => HOSTS.has(String(host || '').toLowerCase());

function parseUrl(value) {
  const raw = String(value ?? '').trim().slice(0, 2000);
  if (!raw) throw new Error('Cole o link do produto ou o link de afiliado.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Link inválido. Cole a URL completa, incluindo https://.'); }
  if (url.protocol !== 'https:') throw new Error('Por segurança, use um link HTTPS.');
  if (url.username || url.password || url.port) throw new Error('Link com credenciais ou porta não é aceito.');
  if (!allowedHost(url.hostname)) throw new Error('O domínio não é um domínio reconhecido do Mercado Livre.');
  url.hash = '';
  return url;
}

async function resolveShort(url) {
  let current = url;
  const chain = [];
  for (let hop = 0; hop < 6; hop++) {
    if (current.hostname.toLowerCase() !== 'meli.la') {
      return { url: current, resolved: true, chain };
    }
    let response;
    try {
      response = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'RadarPromoBrasil/1.0', 'Range': 'bytes=0-0' },
        signal: AbortSignal.timeout(8000)
      });
    } catch {
      return { url: current, resolved: false, chain, reason: 'Não foi possível consultar o redirecionamento do link curto.' };
    }
    const location = response.headers.get('location');
    if (response.body) { try { await response.body.cancel(); } catch {} }
    if (![301,302,303,307,308].includes(response.status) || !location) {
      return { url: current, resolved: false, chain, reason: 'O encurtador não revelou um destino verificável nesta consulta.' };
    }
    let next;
    const locationValue = String(location || '').trim();
    try { next = /^https:\/\//i.test(locationValue) ? new URL(locationValue) : new URL(locationValue, current); } catch {
      return { url: current, resolved: false, chain, reason: 'O encurtador retornou um destino inválido.' };
    }
    if (next.protocol !== 'https:' || next.username || next.password || next.port || !allowedHost(next.hostname)) {
      return { url: current, resolved: false, chain, reason: 'O destino redirecionado não pertence a um domínio permitido; por segurança, o redirecionamento foi bloqueado.' };
    }
    next.hash = '';
    chain.push({ host: current.hostname, status: response.status, nextHost: next.hostname });
    current = next;
  }
  return { url: current, resolved: false, chain, reason: 'O link excedeu o limite de redirecionamentos.' };
}

function identify(url) {
  const host = url.hostname.toLowerCase();
  const path = decodeURIComponent(url.pathname);
  if (host === 'meli.la') {
    return { kind: 'SHORT_LINK', productId: null, normalizedUrl: url.toString() };
  }
  if (/^\/social\//i.test(path)) {
    return { kind: 'PROFILE_LINK', productId: null, normalizedUrl: url.toString() };
  }
  const catalog = path.match(/\/p\/(MLB\d+)/i);
  if (catalog) {
    return { kind: 'CATALOG', productId: catalog[1].toUpperCase(), normalizedUrl: 'https://www.mercadolivre.com.br/p/' + catalog[1].toUpperCase() };
  }
  const item = path.match(/(?:^|\/)(MLB)-?(\d{6,})(?:[-/]|$)/i);
  if (item) {
    const productId = 'MLB' + item[2];
    return { kind: 'ITEM', productId, normalizedUrl: url.toString() };
  }
  return { kind: 'STORE_OR_UNSUPPORTED', productId: null, normalizedUrl: url.toString() };
}

const positiveNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const stockNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const safeImage = value => {
  try { const u = new URL(String(value || '')); return u.protocol === 'https:' ? u.toString() : ''; } catch { return ''; }
};

async function lookupProduct(accountId, parsed) {
  const result = { title: '', price: null, availableQuantity: null, imageUrl: '', productUrl: parsed.normalizedUrl, itemId: '', dataSource: 'NOT_AVAILABLE' };
  if (!accountId || !parsed.productId || !['ITEM','CATALOG'].includes(parsed.kind)) return result;
  try {
    if (parsed.kind === 'ITEM') {
      const response = await meliGet(accountId, '/items/' + encodeURIComponent(parsed.productId));
      if (response.status >= 200 && response.status < 300) {
        const item = response.body || {};
        return {
          title: String(item.title || ''),
          price: positiveNumber(item.price),
          availableQuantity: stockNumber(item.available_quantity),
          imageUrl: safeImage(item.thumbnail || item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url),
          productUrl: String(item.permalink || parsed.normalizedUrl),
          itemId: String(item.id || parsed.productId),
          dataSource: 'MERCADO_LIVRE_ITEMS_API'
        };
      }
      return { ...result, dataSource: 'ITEM_LOOKUP_UNAVAILABLE' };
    }
    const response = await meliGet(accountId, '/products/' + encodeURIComponent(parsed.productId));
    if (response.status < 200 || response.status >= 300) return { ...result, dataSource: 'CATALOG_LOOKUP_UNAVAILABLE' };
    const product = response.body || {}, winner = product.buy_box_winner || {};
    const itemId = String(winner.item_id || winner.item?.id || '');
    let listing = {};
    if (/^MLB-?\d+$/i.test(itemId)) {
      const detail = await meliGet(accountId, '/items/' + encodeURIComponent(itemId));
      if (detail.status >= 200 && detail.status < 300) listing = detail.body || {};
    }
    return {
      title: String(listing.title || product.name || ''),
      price: positiveNumber(listing.price ?? winner.price ?? product.price),
      availableQuantity: stockNumber(listing.available_quantity ?? winner.available_quantity),
      imageUrl: safeImage(listing.thumbnail || listing.pictures?.[0]?.secure_url || listing.pictures?.[0]?.url || winner.thumbnail || product.thumbnail || product.pictures?.[0]?.url),
      productUrl: String(listing.permalink || winner.permalink || winner.item_url || parsed.normalizedUrl),
      itemId: String(listing.id || itemId),
      dataSource: listing.id ? 'MERCADO_LIVRE_ITEMS_API' : 'MERCADO_LIVRE_CATALOG_API'
    };
  } catch (error) {
    if (error?.code === 'MELI_NOT_CONNECTED') return { ...result, dataSource: 'MERCADO_LIVRE_NOT_CONNECTED' };
    console.error('meli/parse-link lookup failed', JSON.stringify({ kind: parsed.kind, code: String(error?.code || '').slice(0,60), status: Number(error?.status)||0 }));
    return { ...result, dataSource: 'LOOKUP_FAILED' };
  }
}

export default async function(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para continuar.' });
  try {
    const input = parseUrl(req.body?.url);
    const originalIsShort = input.hostname.toLowerCase() === 'meli.la';
    let resolved = { url: input, resolved: !originalIsShort, chain: [] };
    if (originalIsShort) resolved = await resolveShort(input);
    const parsed = identify(resolved.url);
    const account = (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1 AND status=\'ACTIVE\' LIMIT 1', [String(req.member.id)])).rows[0];
    const product = await lookupProduct(String(account?.id || ''), parsed);
    const hasRealPrice = positiveNumber(product.price) !== null;
    const hasImage = Boolean(product.imageUrl);
    const hasStock = Number.isFinite(product.availableQuantity) && product.availableQuantity > 0;
    const affiliateQuery = resolved.url.searchParams;
    const affiliateTag = String(affiliateQuery.get('matt_word') || '').trim();
    const affiliateToolId = String(affiliateQuery.get('matt_tool') || '').trim();
    const hasAffiliateTracking = Boolean(affiliateTag);
    const affiliateLinkCandidate = originalIsShort && (['ITEM','CATALOG'].includes(parsed.kind) || (parsed.kind === 'PROFILE_LINK' && hasAffiliateTracking)) ? input.toString() : '';
    return res.json({
      ok: true,
      marketplace: 'MERCADO_LIVRE',
      affiliateTracking: {
        detected: hasAffiliateTracking,
        tag: affiliateTag,
        toolId: affiliateToolId,
        originalShortLink: originalIsShort ? input.toString() : ''
      },
      kind: parsed.kind,
      productId: parsed.productId,
      inputUrl: input.toString(),
      resolvedUrl: resolved.url.toString(),
      normalizedUrl: parsed.normalizedUrl,
      redirectResolved: Boolean(resolved.resolved),
      redirectChain: resolved.chain,
      resolutionNote: resolved.reason || '',
      ...product,
      affiliateLinkCandidate,
      affiliateStatus: parsed.kind === 'PROFILE_LINK' ? (hasAffiliateTracking ? 'AFFILIATE_PROFILE_LINK_TRACKED' : 'PROFILE_URL_NOT_PRODUCT') : (affiliateLinkCandidate ? 'USER_SUPPLIED_NOT_VERIFIED' : 'NOT_PROVIDED'),
      affiliateLinkCreated: false,
      dataChecks: {
        realPriceConfirmed: hasRealPrice,
        imageAvailable: hasImage,
        stockNotKnownToBeZero: hasStock,
        itemIdConfirmed: Boolean(product.itemId)
      },
      canPrepareDraft: Boolean(product.title && product.itemId && hasRealPrice && hasImage && hasStock),
      safeToAutoPublish: false,
      nextStep: parsed.kind === 'PROFILE_LINK'
        ? 'Este é um link de perfil social, não de um produto individual. Abra um anúncio específico e gere um link para ele no portal oficial de afiliados.'
        : (parsed.kind === 'SHORT_LINK'
          ? (resolved.reason || 'Não foi possível resolver este link curto até um anúncio individual. Cole a URL de um anúncio ou gere o link individual no portal oficial.')
          : (parsed.kind === 'CATALOG'
            ? 'Este endereço é de catálogo, não garante um anúncio de vendedor. Abra a página, escolha um anúncio individual com preço e disponibilidade e gere o link oficial de afiliado desse anúncio.'
            : (affiliateLinkCandidate
              ? 'O link curto aponta para um anúncio, mas o crédito de comissão ainda precisa ser confirmado no portal de afiliados.'
              : 'Gere o link pelo portal oficial de afiliados e cole esse link para manter o rastreamento. O Radar não inventa parâmetros de comissão.')))
    });
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Não foi possível interpretar o link.' });
  }
}