import { classifyProduct } from './category-classifier.js';
import { isMedicationProduct } from './product-safety.js';

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const normalizeLomadeeCategory = normalize;
// Product categorization is delegated to the shared, source-agnostic classifier.
function productUrlSlug(value) {
  try {
    const segment = new URL(String(value || '')).pathname.split('/').filter(Boolean).pop() || '';
    return normalize(decodeURIComponent(segment).replace(/[-_]+/g, ' '));
  } catch {
    return normalize(String(value || '').split(/[?#]/)[0].split('/').filter(Boolean).pop() || '');
  }
}

function productFields(product = {}) {
  const option = (Array.isArray(product.options) ? product.options : []).find(item => item?.available) || product.options?.[0] || {};
  const sourceCategories = [
    ...(Array.isArray(product.categories) ? product.categories : []),
    ...(Array.isArray(option.categories) ? option.categories : [])
  ].map(value => String(value ?? '').trim()).filter(Boolean).slice(0, 10);
  const title = String(product.name || option.name || '').trim().slice(0, 220);
  return {
    option, title, sourceCategories,
    // Source category labels are intentionally not mixed with product evidence.
    urlText: productUrlSlug(product.url)
  };
}

export function classifyLomadeeProduct(product = {}) {
  const { option, title, sourceCategories, urlText } = productFields(product);
  const description = [product.description, option.description].filter(Boolean).join(' ');
  if (isMedicationProduct({ title, description, sourceCategory: sourceCategories.join(' '), productUrl: product.url })) {
    return { category: 'Ofertas gerais', subcategory: 'Produto excluído — medicamento', tags: ['medicamento-excluido'], confidence: 1, needsReview: true, reason: 'medication_product_excluded', blocked: true, rule: 'medication-safety' };
  }
  const shared = classifyProduct({ title, description, sourceCategory: sourceCategories.join(' ') });

  // A specific URL slug can disambiguate short variation names (e.g. "Morango"),
  // but it is secondary evidence and always requires human review. API category labels
  // are never mixed into this fallback.
  if (title.length >= 3 && title.length <= 24 && urlText) {
    const fromUrl = classifyProduct({ title: urlText, description });
    if (!fromUrl.needsReview && fromUrl.category !== 'Ofertas gerais' && fromUrl.category !== shared.category) {
      return { ...fromUrl, confidence: Math.min(0.72, Number(fromUrl.confidence) || 0.72), needsReview: true, reason: 'short_title_url_slug_support', blocked: false, rule: 'shared-product-url-slug' };
    }
  }

  if (!shared.needsReview) return { ...shared, blocked: false, rule: 'shared-product-classifier' };
  return { ...shared, blocked: false, rule: 'shared-classifier-review' };
}

export function selectDiverseLomadeeProducts(candidates, options = {}) {
  const maxItems = Math.max(1, Math.min(30, Number(options.maxItems) || 30));
  // Organization/category counts are ranking controls, not exclusion rules.
  // Keep each cap at the per-run ceiling so valid products are not dropped for belonging to one shop/category.
  const maxPerOrganization = Math.max(1, Math.min(30, Number(options.maxPerOrganization) || maxItems));
  const maxPerCategory = Math.max(1, Math.min(30, Number(options.maxPerCategory) || maxItems));
  const seen = new Set();
  const orgCounts = new Map();
  const categoryCounts = new Map();
  const selected = [];

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const product = candidate?.product || {};
    const key = String(product.id || product._id || candidate?.productUrl || product.url || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const organization = String(product.organizationId || candidate?.organizationId || 'unknown');
    const category = String(candidate?.classification?.category || 'Ofertas gerais');
    if ((orgCounts.get(organization) || 0) >= maxPerOrganization) continue;
    if ((categoryCounts.get(category) || 0) >= maxPerCategory) continue;

    selected.push(candidate);
    orgCounts.set(organization, (orgCounts.get(organization) || 0) + 1);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    if (selected.length >= maxItems) break;
  }
  return selected;
}

export const LOMADEE_CATALOG_POLICY = Object.freeze({
  pagesPerRun: 5,
  pageStride: 5,
  maxImportsPerRun: 30,
  maxPerOrganization: 30,
  maxPerCategory: 30,
  version: '1.0.4'
});