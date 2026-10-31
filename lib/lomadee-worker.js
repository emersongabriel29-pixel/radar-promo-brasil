import { classifyLomadeeProduct, selectDiverseLomadeeProducts, LOMADEE_CATALOG_POLICY } from './lomadee-catalog.js';
import { directImageUrl } from './validation.js';

function clean(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function priceCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : NaN;
}

export function lomadeeCatalogPages(now = Date.now()) {
  const basePage = (Math.floor(now / 3600000) % 25) + 1;
  const pages = [];
  for (let index = 0; index < LOMADEE_CATALOG_POLICY.pagesPerRun; index++) {
    pages.push(((basePage - 1 + index * LOMADEE_CATALOG_POLICY.pageStride) % 25) + 1);
  }
  return [...new Set(pages)];
}

export function selectLomadeeDiscoveryProducts(products) {
  const candidates = [];
  for (const product of Array.isArray(products) ? products : []) {
    const option = (Array.isArray(product?.options) ? product.options : []).find(item => item?.available) || product?.options?.[0] || {};
    const pricing = Array.isArray(option.pricing) ? option.pricing[0] : {};
    const title = clean(option.name || product?.name, 220);
    const classification = classifyLomadeeProduct(product);
    const productUrl = typeof product?.url === 'string' && /^https:\/\//i.test(product.url) ? product.url : '';
    const imageUrl = product?.images?.[0]?.url || option.images?.[0]?.url || '';
    const originalPrice = priceCents(pricing.listPrice);
    const currentPrice = priceCents(pricing.price);

    if (classification.blocked || !product?.available || option.available === false) continue;
    if (!title || !product?.organizationId || !productUrl || !directImageUrl(imageUrl)) continue;
    if (!Number.isSafeInteger(originalPrice) || !Number.isSafeInteger(currentPrice) || currentPrice <= 0) continue;
    if (originalPrice <= currentPrice) continue;

    candidates.push({
      product, option, title, productUrl, imageUrl, originalPrice, currentPrice, classification,
      organizationId: String(product.organizationId)
    });
  }

  return selectDiverseLomadeeProducts(candidates, {
    maxItems: LOMADEE_CATALOG_POLICY.maxImportsPerRun,
    maxPerOrganization: LOMADEE_CATALOG_POLICY.maxPerOrganization,
    maxPerCategory: LOMADEE_CATALOG_POLICY.maxPerCategory
  }).map(candidate => candidate.product);
}
