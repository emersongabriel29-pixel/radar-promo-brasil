export const access = 'member';
export const methods = ['POST'];

const MAX_BYTES = 1024 * 1024;
const MAX_PRODUCTS = 24;
const ALLOWED_HOSTS = new Set(['magazinevoce.com.br', 'www.magazinevoce.com.br', 'magazineluiza.com.br', 'www.magazineluiza.com.br']);

function parseInput(value) {
  let url;
  try { url = new URL(String(value || '').trim().slice(0, 2000)); } catch { throw Object.assign(new Error('Cole uma URL completa e válida.'), { status: 400 }); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw Object.assign(new Error('Por segurança, use HTTPS em magazinevoce.com.br ou magazineluiza.com.br.'), { status: 400 });
  url.hash = '';
  return url;
}
function safePublicUrl(value, base) {
  try { const url = new URL(String(value || ''), base); const host = url.hostname.toLowerCase(); const allowed = ALLOWED_HOSTS.has(host) || host === 'a-static.mlcdn.com.br' || host.endsWith('.a-static.mlcdn.com.br') || host === 'mvc.mlcdn.com.br' || host.endsWith('.mvc.mlcdn.com.br'); if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) return ''; return url.toString(); } catch { return ''; }
}
function decodeHtml(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).trim();
}
function meta(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const name = (tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const content = (tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (String(name || '').toLowerCase() === key.toLowerCase() && content != null) return decodeHtml(content);
  }
  return '';
}
function absolutePageUrl(value, base) {
  try {
    const url = new URL(String(value || ''), base);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return '';
    url.hash = '';
    return url.toString();
  } catch { return ''; }
}
function numberPrice(value) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 && parsed < 100000000 ? parsed : null;
}
function productRecord(value, base) {
  if (!value || typeof value !== 'object') return null;
  const offers = Array.isArray(value.offers) ? value.offers[0] : value.offers;
  const image = Array.isArray(value.image) ? value.image[0] : value.image;
  const productUrl = absolutePageUrl(value.url || value['@id'], base);
  const imageUrl = safePublicUrl(typeof image === 'string' ? image : image?.url, base);
  const title = String(value.name || value.title || '').trim().slice(0, 220);
  if (!title || (!productUrl && !imageUrl)) return null;
  return { title, description: String(value.description || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 600), currentPrice: numberPrice(offers?.price || offers?.lowPrice || value.price), imageUrl, productUrl };
}
function collectJsonProducts(html, base) {
  const out = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1].replace(/&quot;/g, '"').trim());
      const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(visit); return; }
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        if (types.some(t => /product/i.test(String(t)))) {
          const record = productRecord(node, base);
          if (record) out.push(record);
        }
        if (node['@graph']) visit(node['@graph']);
        if (node.itemListElement) visit(node.itemListElement);
        if (node.item && typeof node.item === 'object') visit(node.item);
      };
      visit(data);
    } catch {}
  }
  return out;
}
function collectProductLinks(html, base) {
  const out = [];
  const seen = new Set();
  const anchors = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  for (const anchor of anchors) {
    const href = (anchor.match(/\bhref=["']([^"']+)["']/i) || [])[1];
    const url = absolutePageUrl(href, base);
    if (!url || seen.has(url) || url === base.toString()) continue;
    const title = decodeHtml(anchor.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
    if (title.length < 5 || title.length > 220) continue;
    if (!/produto|product|p\//i.test(url) && !/\/[^/]+-\d{5,}(?:[/?]|$)/i.test(url)) continue;
    seen.add(url);
    out.push({ title, description: '', currentPrice: null, imageUrl: '', productUrl: url });
    if (out.length >= MAX_PRODUCTS) break;
  }
  return out;
}
async function readLimited(response) {
  if (!response.body) return '';
  const reader = response.body.getReader(), chunks = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { try { await reader.cancel(); } catch {} throw Object.assign(new Error('A página excede o limite seguro de leitura (1 MB).'), { status: 413 }); }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}
async function fetchPage(initial) {
  let url = initial;
  for (let hop = 0; hop < 5; hop++) {
    const response = await fetch(url.toString(), { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadarPromoBrasil/1.0; +https://radar-promo-brasil.hatchable.site)', Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(10000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (response.body) { try { await response.body.cancel(); } catch {} }
      if (!location) throw Object.assign(new Error('A loja redirecionou sem informar o destino.'), { status: 502 });
      url = parseInput(new URL(location, url).toString()); continue;
    }
    if (!response.ok) { if (response.body) { try { await response.body.cancel(); } catch {} } throw Object.assign(new Error('A página pública da loja respondeu HTTP ' + response.status + '. Se exigir login ou proteção, importe os dados manualmente.'), { status: 502 }); }
    if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) { if (response.body) { try { await response.body.cancel(); } catch {} } throw Object.assign(new Error('O endereço não retornou uma página HTML pública.'), { status: 415 }); }
    return { url, html: await readLimited(response) };
  }
  throw Object.assign(new Error('A página excedeu o limite de redirecionamentos.'), { status: 502 });
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para usar o Modo Clone.' });
  try {
    const input = parseInput(req.body?.url);
    const { url: finalUrl, html } = await fetchPage(input);
    const title = meta(html, 'og:title') || meta(html, 'twitter:title') || decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').slice(0, 220);
    const description = meta(html, 'og:description') || meta(html, 'description') || meta(html, 'twitter:description');
    const imageUrl = safePublicUrl(meta(html, 'og:image') || meta(html, 'twitter:image'), finalUrl);
    const currentPrice = numberPrice(meta(html, 'product:price:amount') || meta(html, 'og:price:amount') || (html.match(/"price"\s*:\s*"?([\d]+(?:[.,][\d]{1,2})?)"?/i) || [])[1]);
    const host = finalUrl.hostname.toLowerCase();
    const affiliateCandidate = '';
    const isStorefront = /magazinevoce\.com\.br/i.test(finalUrl.hostname) && !/\/produto\//i.test(finalUrl.pathname);
    let products = collectJsonProducts(html, finalUrl);
    if (isStorefront) products = products.concat(collectProductLinks(html, finalUrl));
    const seen = new Set();
    products = products.filter(p => { const key = p.productUrl || p.title; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, MAX_PRODUCTS);
    if (!products.length && title) products = [{ title, description, currentPrice, imageUrl, productUrl: finalUrl.toString() }];
    products = products.map(p => ({ ...p, affiliateLinkCandidate: '', affiliateTrackingVerified: false }));
    return res.json({
      ok: true, source: 'PUBLIC_PAGE_METADATA', pageTitle: String(title || '').slice(0, 220),
      description: String(description || '').slice(0, 1000), imageUrl, currentPrice,
      productUrl: finalUrl.toString(), affiliateLinkCandidate: '', affiliateTrackingVerified: false,
      isStorefront, products, productCount: products.length, maxProducts: MAX_PRODUCTS,
      fieldsNeedReview: ['title', 'currentPrice', 'imageUrl', 'affiliateUrl'],
      note: 'Importação limitada a metadados e links presentes no HTML público (máximo de 24 itens). Páginas que carregam produtos via JavaScript podem não expor todos os itens. Preços e links de comissão precisam de confirmação no Parceiro Magalu.'
    });
  } catch (error) {
    console.error('magalu clone inspect', JSON.stringify({ status: Number(error?.status) || 500, name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(Number(error?.status) || 502).json({ error: String(error?.message || 'Não foi possível ler os metadados públicos da loja.').slice(0, 300) });
  }
}