const generalCategory = value => !value || String(value).trim().toLowerCase() === 'ofertas gerais';

export function selectDiverseCandidates(candidates = [], options = {}) {
  const limit = Math.max(0, Math.floor(Number(options.limit) || 12));
  const firstCategoryCap = Math.max(1, Math.floor(Number(options.perCategory) || 1));
  const firstMerchantCap = Math.max(1, Math.floor(Number(options.perMerchant) || 1));
  const fillCategoryCap = Math.max(firstCategoryCap, Math.floor(Number(options.fillPerCategory) || firstCategoryCap + 1));
  const fillMerchantCap = Math.max(firstMerchantCap, Math.floor(Number(options.fillPerMerchant) || firstMerchantCap + 1));
  const selected = [];
  const categoryCounts = new Map();
  const merchantCounts = new Map();
  const identity = item => String(item?.id || item?.itemId || item?.externalId || item?.fp || item?.title || selected.length);
  const categoryKey = item => {
    const category = item?.classified?.category || item?.categoryName || item?.category?.name || '';
    return generalCategory(category) ? 'unknown:' + identity(item) : String(category).toLowerCase();
  };
  const merchantKey = item => String(item?.merchantId || item?.shopId || item?.merchantName || item?.shopName || 'unknown:' + identity(item));
  const add = item => {
    selected.push(item);
    const c = categoryKey(item), m = merchantKey(item);
    categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1);
    merchantCounts.set(m, (merchantCounts.get(m) || 0) + 1);
  };
  const fill = (categoryCap, merchantCap) => {
    for (const item of candidates) {
      if (selected.length >= limit) break;
      if (selected.includes(item)) continue;
      if ((categoryCounts.get(categoryKey(item)) || 0) >= categoryCap) continue;
      if ((merchantCounts.get(merchantKey(item)) || 0) >= merchantCap) continue;
      add(item);
    }
  };
  fill(firstCategoryCap, firstMerchantCap);
  if (selected.length < limit) fill(fillCategoryCap, fillMerchantCap);
  return selected;
}