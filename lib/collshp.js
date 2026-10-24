import { fetchPinnedHttps } from './network-guard.js';

const MAX_BYTES = 1024 * 1024;
const clean = (v, n = 300) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const okHost = h => h === 'collshp.com' || h.endsWith('.collshp.com');

export function parseCollshpUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim().slice(0, 500)); } catch { throw Object.assign(new Error('Informe a URL pública da vitrine Collshp.'), { status: 400 }); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !okHost(url.hostname.toLowerCase())) {
    throw Object.assign(new Error('Use um link HTTPS de collshp.com, sem credenciais ou porta.'), { status: 400 });
  }
  url.hash = '';
  return url;
}

const httpsOnly = (value, base) => {
  try { const u = new URL(String(value || ''), base); return u.protocol === 'https:' && !u.username && !u.password ? u.toString().slice(0, 2000) : ''; } catch { return ''; }
};

function jsonBlocks(html) {
  const blocks = [];
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/(?:ld\+json|json)["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { blocks.push(JSON.parse(m[1])); } catch { /* bloco inválido é ignorado */ }
  }
  return blocks;
}

function walk(node, visit, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 12) return;
  if (Array.isArray(node)) { for (const x of node) walk(x, visit, depth + 1); return; }
  visit(node);
  for (const v of Object.values(node)) walk(v, visit, depth + 1);
}

export function parseCollshpHtml(html, baseUrl) {
  const found = new Map();
  const add = (title, link, image) => {
    const productUrl = httpsOnly(link, baseUrl), t = clean(title);
    if (!t || !productUrl || found.size >= 50) return;
    if (!found.has(productUrl)) found.set(productUrl, { title: t, productUrl, imageUrl: httpsOnly(Array.isArray(image) ? image[0] : (image?.url || image), baseUrl) });
  };
  for (const block of jsonBlocks(html)) {
    walk(block, n => {
      const type = [].concat(n['@type'] || []).map(String);
      if (type.includes('Product')) add(n.name, n.url || n.offers?.url, n.image);
      else if ((n.name || n.title || n.productName) && (n.url || n.productUrl || n.link) && (n.image || n.imageUrl || n.thumbnail)) {
        add(n.name || n.title || n.productName, n.url || n.productUrl || n.link, n.image || n.imageUrl || n.thumbnail);
      }
    });
  }
  const title = clean((html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) || html.match(/<title>([^<]*)<\/title>/i) || [])[1], 120);
  return { storefront: { name: title || 'Vitrine Collshp' }, products: [...found.values()] };
}

async function readBody(response, deadline) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      if (Date.now() >= deadline) throw Object.assign(new Error('Tempo limite ao consultar a vitrine.'), { status: 504 });
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw Object.assign(new Error('Página acima de 1 MiB.'), { status: 502 });
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, size).toString('utf8');
  } catch (error) {
    try { await reader.cancel(error); } catch {}
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export async function fetchCollshpPage(value, { timeout = 8000 } = {}) {
  let url = parseCollshpUrl(value);
  const deadline = Date.now() + timeout;
  for (let hop = 0; hop <= 3; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw Object.assign(new Error('Tempo limite ao consultar a vitrine.'), { status: 504 });
    const response = await fetchPinnedHttps(url.toString(), {
      timeout: remaining,
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'RadarPromoBrasil/1.0' }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (response.body) await response.body.cancel();
      url = parseCollshpUrl(new URL(location || '', url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      if (response.body) await response.body.cancel();
      throw Object.assign(new Error('A vitrine respondeu HTTP ' + response.status + '.'), { status: 502 });
    }
    if (!/text\/html|application\/xhtml/i.test(String(response.headers.get('content-type') || ''))) {
      if (response.body) await response.body.cancel();
      throw Object.assign(new Error('A vitrine não retornou uma página HTML.'), { status: 502 });
    }
    return { html: await readBody(response, deadline), url: url.toString() };
  }
  throw Object.assign(new Error('Redirecionamentos demais.'), { status: 502 });
}
