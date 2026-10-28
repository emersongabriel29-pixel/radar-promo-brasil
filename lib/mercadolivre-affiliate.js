const API_URL = 'https://www.mercadolivre.com.br/affiliate-program/api/v2/stripe/user/links';
const MAX_URL_LENGTH = 2000;
const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);

export function validateMercadoLivreProductUrl(value) {
  const raw = clean(value, MAX_URL_LENGTH);
  if (!raw || raw.length > MAX_URL_LENGTH) return '';
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/\\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (!(host === 'mercadolivre.com.br' || host.endsWith('.mercadolivre.com.br') || host === 'meli.la')) return '';
    if (host === 'meli.la' && !url.pathname) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function cookieHeader(cookies) {
  if (!Array.isArray(cookies) || !cookies.length || cookies.length > 100) {
    throw Object.assign(new Error('Sessão do Mercado Livre ausente ou inválida.'), { status: 412 });
  }
  const safe = cookies.filter(c => c && /^[A-Za-z0-9_-]{1,100}$/.test(String(c.name || '')) &&
    typeof c.value === 'string' && c.value.length > 0 && c.value.length <= 4096);
  if (safe.length !== cookies.length) throw Object.assign(new Error('Formato de cookies inválido.'), { status: 412 });
  return safe.map(c => c.name + '=' + c.value).join('; ');
}

function validateAffiliateUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    const host = url.hostname.toLowerCase().replace(/\\.$/, '');
    if (url.protocol === 'https:' && !url.username && !url.password &&
        (host === 'meli.la' || host === 'mercadolivre.com.br' || host.endsWith('.mercadolivre.com.br'))) {
      return url.toString();
    }
  } catch {}
  throw Object.assign(new Error('O Mercado Livre não retornou um link HTTPS de afiliado reconhecido.'), { status: 502 });
}

export async function createMercadoLivreAffiliateUrl({
  productUrl, tag, cookies, fetchImpl = fetch
}) {
  const safeUrl = validateMercadoLivreProductUrl(productUrl);
  if (!safeUrl) throw Object.assign(new Error('Informe uma URL HTTPS válida de produto do Mercado Livre Brasil ou meli.la.'), { status: 400 });
  const safeTag = clean(tag, 200);
  if (!safeTag || !Array.isArray(cookies)) throw Object.assign(new Error('Tag de afiliado e sessão autenticada são obrigatórias.'), { status: 412 });
  const cookie = cookieHeader(cookies);
  if (typeof fetchImpl !== 'function') throw new Error('Cliente HTTP indisponível.');

  let csrf = cookies.find(c => c.name === '_csrf')?.value || '';
  const page = await fetchImpl(safeUrl, {
    method: 'GET',
    headers: { cookie, accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; RadarPromoBrasil/1.0)' },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow'
  });
  if (!page.ok) throw Object.assign(new Error('Não foi possível validar a sessão na página do produto (HTTP ' + page.status + ').'), { status: 502 });
  const html = await page.text();
  const tokenMatch = html.match(/(?:csrf-token|csrfToken|_csrf)["'\\s:=]+([A-Za-z0-9._-]{8,500})/i);
  if (tokenMatch) csrf = tokenMatch[1];
  if (!csrf || csrf.length > 500) throw Object.assign(new Error('Token CSRF ausente; atualize a sessão do Mercado Livre.'), { status: 412 });

  const response = await fetchImpl(API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'x-csrf-token': csrf,
      cookie,
      referer: safeUrl,
      origin: 'https://www.mercadolivre.com.br',
      'user-agent': 'Mozilla/5.0 (compatible; RadarPromoBrasil/1.0)'
    },
    body: JSON.stringify({ url: safeUrl, tag: safeTag }),
    signal: AbortSignal.timeout(12000),
    redirect: 'error'
  });
  if (!response.ok) throw Object.assign(new Error('O Mercado Livre recusou a geração do link (HTTP ' + response.status + ').'), { status: 502 });
  let data;
  try { data = await response.json(); } catch {
    throw Object.assign(new Error('Resposta inválida do gerador de links do Mercado Livre.'), { status: 502 });
  }
  return validateAffiliateUrl(data?.short_url);
}

export const mercadoLivreAffiliateMetadata = Object.freeze({
  status: 'EXPERIMENTAL_UNOFFICIAL_ENDPOINT',
  publicationEnabled: false,
  requiresServerSecrets: ['MELI_AFFILIATE_TAG', 'MELI_AFFILIATE_COOKIES_JSON']
});
