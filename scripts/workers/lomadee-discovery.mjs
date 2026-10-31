import { createHash, createHmac } from 'node:crypto';
import { lomadeeCatalogPages, selectLomadeeDiscoveryProducts } from '../../lib/lomadee-worker.js';

const API_BASE = 'https://api.lomadee.com.br';
const RADAR_URL = 'https://radar-promo-brasil.hatchable.site';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function list(body) {
  if (Array.isArray(body)) return body;
  for (const key of ['data', 'items', 'products']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

async function fetchPage(apiKey, page) {
  const url = new URL('/affiliate/products', API_BASE);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', '100');
  url.searchParams.set('isAvailable', 'true');

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-api-key': apiKey, accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { throw new Error('LOMADEE_INVALID_JSON'); }
  if (response.status === 429) throw new Error('LOMADEE_RATE_LIMIT');
  if (!response.ok) throw new Error('LOMADEE_HTTP_' + response.status);
  return list(body);
}

async function main() {
  const apiKey = String(process.env.LOMADEE_API_KEY || '').trim();
  const workerSecret = String(process.env.RADAR_WORKER_SECRET || '');
  if (!apiKey || workerSecret.length < 32) {
    throw new Error('Configure LOMADEE_API_KEY e RADAR_WORKER_SECRET nos segredos do GitHub Actions.');
  }

  const pages = lomadeeCatalogPages(Date.now());
  const successfulPages = [];
  const products = [];
  let rateLimited = false;
  let pageFailures = 0;

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    try {
      const rows = await fetchPage(apiKey, page);
      successfulPages.push(page);
      products.push(...rows);
    } catch (error) {
      pageFailures++;
      if (String(error?.message || '').includes('RATE_LIMIT')) {
        rateLimited = true;
        break;
      }
    }
    if (index < pages.length - 1 && !rateLimited) await sleep(1000);
  }

  if (!successfulPages.length) throw new Error('Nenhuma página do catálogo Lomadee respondeu com sucesso.');

  const selected = selectLomadeeDiscoveryProducts(products);
  const apiKeyFingerprint = createHash('sha256').update(apiKey).digest('hex');
  const payload = {
    operation: 'external_worker_products',
    pages: successfulPages,
    items: selected,
    apiKeyFingerprint
  };
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', workerSecret).update(timestamp + '.' + rawBody).digest('hex');

  const response = await fetch(RADAR_URL + '/api/worker/lomadee-discovery', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rpb-timestamp': timestamp,
      'x-rpb-signature': 'sha256=' + signature
    },
    body: rawBody,
    signal: AbortSignal.timeout(15000)
  });
  const responseText = await response.text();
  let result = {};
  try { result = responseText ? JSON.parse(responseText) : {}; } catch {}
  if (!response.ok) throw new Error('RADAR_INGEST_HTTP_' + response.status);

  process.stdout.write(JSON.stringify({
    ok: true,
    marketplace: 'LOMADEE',
    pagesRequested: pages.length,
    pagesSucceeded: successfulPages.length,
    pageFailures,
    rateLimited,
    productsScanned: products.length,
    productsSelected: selected.length,
    productsPersisted: Number(result.recordsUpserted || 0),
    sideEffects: false
  }) + '\n');
}

main().catch(error => {
  process.stderr.write(String(error?.message || 'LOMADEE_WORKER_FAILED').slice(0, 220) + '\n');
  process.exitCode = 1;
});
