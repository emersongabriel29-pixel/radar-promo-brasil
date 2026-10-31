import { config, db } from 'hatchable';
import { fetchWithRetry } from 'lib/http-retry.js';
import { fingerprint, message as promoMessage, offerScore } from 'lib/automation.js';
import { directImageUrl } from 'lib/validation.js';
import { classifyLomadeeProduct, normalizeLomadeeCategory, selectDiverseLomadeeProducts, LOMADEE_CATALOG_POLICY } from 'lib/lomadee-catalog.js';
import { persistDiscoveryPage } from 'lib/affiliate-discovery.js';

export const access = 'scheduler';
export const methods = ['POST'];
const BASE = 'https://api.lomadee.com.br';
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const list = body => Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : Array.isArray(body?.products) ? body.products : [];
const parseMoney = value => {
  if (value === null || value === undefined || value === '') return NaN;
  const raw = String(value).trim().replace(/[^0-9,.-]/g, '');
  if (!raw) return NaN;
  const comma = raw.lastIndexOf(','), dot = raw.lastIndexOf('.');
  let normalized = raw;
  if (comma >= 0 && dot >= 0) normalized = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  else if (comma >= 0) normalized = raw.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : NaN;
};
const priceCents = value => { const n = parseMoney(value); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };

async function readCredentials(row) {
  let raw = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (raw.length < 32) raw = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (raw.length < 32) throw new Error('Chave mestra de credenciais ausente');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + '|radar-marketplace-credentials|' + row.account_id + '|LOMADEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function request(path, apiKey, params = {}, method = 'GET', payload = null) {
  const url = new URL(BASE + path);
  if (method === 'GET') for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  const response = await fetchWithRetry(url.toString(), {
    method,
    headers: { 'x-api-key': apiKey, accept: 'application/json', ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(payload || {}) } : {}),
    signal: AbortSignal.timeout(8000)
  });
  const bodyText = await response.text();
  let body = {};
  try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { body = {}; }
  if (!response.ok) {
    const providerMessage = clean(body?.message || body?.error || body?.detail || body?.subMessage || '', 180);
    const providerCode = clean(body?.code || body?.errorCode || '', 80);
    throw Object.assign(new Error('HTTP ' + response.status + (providerCode ? ' [' + providerCode + ']' : '') + (providerMessage ? ': ' + providerMessage : '')), { status: response.status, providerCode });
  }
  return body;
}

function catalogPages(basePage, dryRunPage) {
  if (dryRunPage) return [dryRunPage];
  const pages = [];
  for (let index = 0; index < LOMADEE_CATALOG_POLICY.pagesPerRun; index++) {
    pages.push(((basePage - 1 + index * LOMADEE_CATALOG_POLICY.pageStride) % 25) + 1);
  }
  return [...new Set(pages)];
}

function categoryIds(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const key = normalizeLomadeeCategory(row.name);
    if (!key) continue;
    const previous = map.get(key);
    if (!previous || (String(row.id).startsWith('cat-') && !String(previous).startsWith('cat-'))) map.set(key, String(row.id));
  }
  return map;
}

export default async function handler(req, res) {
  let externalDiscoveryEnabled = false;
  try { externalDiscoveryEnabled = String(await config.get('lomadee_external_discovery_enabled') || '').toLowerCase() === 'true'; } catch {}
  const credentialsRows = (await db.query(
    "SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='LOMADEE' AND status='VALIDATED'"
  )).rows;
  const dryRun = req.body?.dryRun === true;
  const requestedDryPage = Number(req.body?.dryRunPage);
  const dryRunPage = dryRun && Number.isInteger(requestedDryPage) && requestedDryPage >= 1 && requestedDryPage <= 25 ? requestedDryPage : 0;
  const basePage = (Math.floor(Date.now() / 3600000) % 25) + 1;
  const pages = catalogPages(basePage, dryRunPage);
  const totals = {
    accounts: credentialsRows.length, scanned: 0, imported: 0, duplicates: 0, skipped: 0,
    failed: 0, autopilotRuns: 0, dryRun, externalDiscoveryEnabled, pages, classificationPolicyVersion: LOMADEE_CATALOG_POLICY.version,
    maxImportsPerRun: LOMADEE_CATALOG_POLICY.maxImportsPerRun,
    eligibleBeforeAffiliate: 0, selected: 0, skipReasons: {
      unavailable: 0, missingTitle: 0, missingOrganization: 0, missingProductUrl: 0,
      missingImage: 0, invalidPrice: 0, missingPricing: 0, noDiscount: 0,
      noAffiliateLink: 0, medication: 0
    }
  };

  for (const row of credentialsRows) {
    let accountImported = 0;
    try {
      const credentials = await readCredentials(row);
      const apiKey = clean(credentials.apiKey, 4096);
      if (!apiKey) throw new Error('Chave API ausente');

      const categoryRows = (await db.query(
        "SELECT id,name FROM categories WHERE account_id=$1 ORDER BY created_at,id",
        [row.account_id]
      )).rows;
      const categoryMap = categoryIds(categoryRows);
      const fallbackCategoryId = categoryMap.get('ofertas gerais') || null;
      const candidates = [];
      let successfulPages = 0;
      totals.skipReasons ||= {};
      let productBatches = [];

      if (externalDiscoveryEnabled) {
        const latestRun = (await db.query(
          "SELECT id FROM affiliate_discovery_runs WHERE account_id=$1 AND marketplace='LOMADEE' AND operation='external_worker_products' AND status='COMPLETED' AND started_at>now()-interval '90 minutes' ORDER BY started_at DESC LIMIT 1",
          [row.account_id]
        )).rows[0];
        if (latestRun) {
          const externalRows = (await db.query(
            "SELECT raw_data FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='LOMADEE' AND kind='PRODUCT' AND last_run_id=$2 ORDER BY title LIMIT 100",
            [row.account_id, latestRun.id]
          )).rows;
          const externalProducts = externalRows.map(item => {
            if (typeof item.raw_data === 'string') {
              try { return JSON.parse(item.raw_data); } catch { return null; }
            }
            return item.raw_data && typeof item.raw_data === 'object' ? item.raw_data : null;
          }).filter(Boolean);
          if (externalProducts.length) {
            productBatches = [externalProducts];
            successfulPages = 1;
            totals.discoverySource = 'EXTERNAL_WORKER';
            totals.externalDiscoveryRunId = latestRun.id;
          }
        }
      }

      if (!productBatches.length) {
        totals.discoverySource = externalDiscoveryEnabled ? 'HATCHABLE_FALLBACK' : 'HATCHABLE';
        totals.externalDiscoveryFallback = externalDiscoveryEnabled;
        for (const page of pages) {
          let response;
          try {
            response = await request('/affiliate/products', apiKey, { page, limit: 100, isAvailable: true });
            successfulPages++;
          } catch (error) {
            totals.failed++;
            totals.pageErrors ||= [];
            totals.pageErrors.push({ page, status: Number(error?.status) || 0 });
            if (Number(error?.status) === 429) break;
            continue;
          }
          productBatches.push(list(response));
        }
      }

      for (const products of productBatches) {
        totals.scanned += products.length;
        for (const product of products) {
          const option = (Array.isArray(product.options) ? product.options : []).find(item => item?.available) || product.options?.[0] || {};
          const pricing = Array.isArray(option.pricing) ? option.pricing[0] : {};
          const title = clean(option.name || product.name, 220);
          const classification = classifyLomadeeProduct(product);
          const productUrl = typeof product.url === 'string' && /^https:\/\//i.test(product.url) ? product.url : '';
          const imageUrl = product.images?.[0]?.url || option.images?.[0]?.url || '';
          const currentPrice = priceCents(pricing.price) || priceCents(pricing.listPrice);
          const listedOriginalPrice = priceCents(pricing.listPrice);
          // A missing/equal list price is not a reason to discard a valid product; record it at current price with 0% discount.
          const originalPrice = Number.isSafeInteger(currentPrice) ? Math.max(Number.isSafeInteger(listedOriginalPrice) ? listedOriginalPrice : currentPrice, currentPrice) : listedOriginalPrice;

          if (classification.blocked) { totals.skipped++; totals.skipReasons.medication++; continue; }
          if (!product.available || option.available === false) { totals.skipped++; totals.skipReasons.unavailable++; continue; }
          if (!title) { totals.skipped++; totals.skipReasons.missingTitle++; continue; }
          if (!product.organizationId) { totals.skipped++; totals.skipReasons.missingOrganization++; continue; }
          if (!productUrl) { totals.skipped++; totals.skipReasons.missingProductUrl++; continue; }
          if (!directImageUrl(imageUrl)) { totals.skipped++; totals.skipReasons.missingImage++; continue; }
          if (!Number.isSafeInteger(originalPrice) || !Number.isSafeInteger(currentPrice) || currentPrice <= 0) {
            totals.skipped++; totals.skipReasons.invalidPrice++;
            if (!Array.isArray(option.pricing) || !option.pricing.length) totals.skipReasons.missingPricing++;
            totals.priceDiagnostics ||= [];
            if (totals.priceDiagnostics.length < 5) totals.priceDiagnostics.push({
              productId: clean(product.id, 80), pricingCount: Array.isArray(option.pricing) ? option.pricing.length : 0,
              listPrice: pricing.listPrice ?? null, price: pricing.price ?? null
            });
            continue;
          }
          // Zero-discount products remain eligible; discount is a ranking signal, not an exclusion rule.

          candidates.push({
            product, option, title, productUrl, imageUrl, originalPrice, currentPrice, classification,
            organizationId: String(product.organizationId)
          });
        }
      }

      if (!successfulPages) throw new Error('Nenhuma página do catálogo Lomadee pôde ser consultada.');
      if (!dryRun && productBatches.length) {
        const discovery = await persistDiscoveryPage(db, {
          accountId: row.account_id, marketplace: 'LOMADEE', operation: 'products', kind: 'PRODUCT',
          items: productBatches.flat()
        });
        totals.discoveryRecordsSeen = (totals.discoveryRecordsSeen || 0) + discovery.recordsSeen;
        totals.discoveryRecordsUpserted = (totals.discoveryRecordsUpserted || 0) + discovery.recordsUpserted;
        totals.discoverySkipped = (totals.discoverySkipped || 0) + discovery.skipped;
        totals.discoveryRunId = discovery.runId;
      }
      totals.eligibleBeforeAffiliate += candidates.length;
      const selected = selectDiverseLomadeeProducts(candidates, {
        maxItems: LOMADEE_CATALOG_POLICY.maxImportsPerRun,
        maxPerOrganization: LOMADEE_CATALOG_POLICY.maxPerOrganization,
        maxPerCategory: LOMADEE_CATALOG_POLICY.maxPerCategory
      });
      totals.selected += selected.length;
      totals.selectedByCategory ||= {};
      totals.selectedByOrganization ||= {};
      for (const candidate of selected) {
        const category = candidate.classification.category;
        totals.selectedByCategory[category] = (totals.selectedByCategory[category] || 0) + 1;
        totals.selectedByOrganization[candidate.organizationId] = (totals.selectedByOrganization[candidate.organizationId] || 0) + 1;
      }

      if (req.body?.queueOnly === true || req.body?.queueOnly === 'true') {
        totals.queueOnly = true;
        totals.pendingForQueue = candidates.length;
        continue;
      }

      if (dryRun) {
        totals.preview = selected.slice(0, 20).map(candidate => ({
          title: candidate.title, organizationId: candidate.organizationId,
          category: candidate.classification.category,
          categoryId: categoryMap.get(normalizeLomadeeCategory(candidate.classification.category)) || fallbackCategoryId,
          subcategory: candidate.classification.subcategory, confidence: candidate.classification.confidence,
          price: candidate.currentPrice, originalPrice: candidate.originalPrice
        }));
        continue;
      }

      for (const candidate of selected) {
        const { product, title, productUrl, imageUrl, originalPrice, currentPrice, classification } = candidate;
        const fp = await fingerprint({ source: 'LOMADEE', externalId: clean(product.id, 120), productUrl, title, organizationId:product.organizationId||'', currentPrice, originalPrice, variant:product.optionId||product.sku||'' });
        let shortResponse;
        try {
          shortResponse = await request('/affiliate/shortener/url', apiKey, {}, 'POST', {
            organizationId: String(product.organizationId), type: 'Custom', url: productUrl
          });
        } catch (error) {
          totals.skipped++; totals.skipReasons.noAffiliateLink++;
          totals.shortenerFailures = (totals.shortenerFailures || 0) + 1;
          continue;
        }
        const affiliateUrl = (Array.isArray(shortResponse) ? shortResponse : list(shortResponse))
          .flatMap(item => Array.isArray(item.shortUrls) ? item.shortUrls : [])
          .find(value => typeof value === 'string' && /^https:\/\//i.test(value));
        if (!affiliateUrl) { totals.skipped++; totals.skipReasons.noAffiliateLink++; continue; }

        const categoryId = categoryMap.get(normalizeLomadeeCategory(classification.category)) || fallbackCategoryId;
        const discount = Math.round((originalPrice - currentPrice) * 100 / originalPrice);
        const score = offerScore({ title, currentPrice, originalPrice });
        const promo = promoMessage({ title, source: 'LOMADEE', currentPrice, originalPrice, affiliateUrl, imageUrl, productUrl });
        const inserted = await db.query(
          "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,classification_tags,classification_confidence,classification_status,classification_reason,source_category,subcategory) VALUES($1,$2,$3,'LOMADEE',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'PENDING',$12,$13,'NEEDS_REVIEW','AUTO',false,$14::jsonb,$15,'REVIEW',$16,$17,$18) ON CONFLICT DO NOTHING RETURNING id",
          [
            crypto.randomUUID(), row.account_id, title, originalPrice, currentPrice, categoryId,
            affiliateUrl, imageUrl, productUrl, discount, score, promo, fp,
            JSON.stringify(classification.tags), classification.confidence,
            'lomadee_rules_v' + LOMADEE_CATALOG_POLICY.version + ':' + classification.rule,
            classification.category, classification.subcategory
          ]
        );
        if (inserted.rows.length) {
          const offerId = inserted.rows[0].id;
          try {
            await db.query(
              "INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())",
              [crypto.randomUUID(), row.account_id, offerId, currentPrice, originalPrice, 'LOMADEE:' + clean(product.id, 120)]
            );
            totals.imported++;
            accountImported++;
          } catch (historyError) {
            await db.query(
              "UPDATE offers SET status='PENDING',validation_status='NEEDS_REVIEW' WHERE id=$1 AND account_id=$2",
              [offerId, row.account_id]
            );
            totals.failed++;
            console.error('lomadee price history failed', String(historyError?.code || historyError?.name || 'ERROR').slice(0, 60));
          }
        } else totals.duplicates++;
      }

      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'", [row.account_id]);
      // Lomadee imports remain pending for human review; never trigger autopilot or publication here.
    } catch (error) {
      totals.failed++;
      const code = Number(error?.status) || 0;
      const safeError = code === 401 ? 'Lomadee API Key inválida (HTTP 401).' : code === 403 ? 'A chave Lomadee não tem o escopo necessário; confira products:read e shortener:write.' : code === 429 ? 'Limite da API Lomadee atingido; a próxima execução tentará novamente.' : 'Falha de conexão ou resposta da API Lomadee.';
      if (!dryRun) await db.query("UPDATE marketplace_api_credentials SET last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'", [row.account_id, safeError]);
      console.error('lomadee ingestion failed', String(code || error?.name || 'ERROR').slice(0, 60));
    }
  }
  return res.json({ ok: totals.failed === 0, ...totals });
}