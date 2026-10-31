const INT64_MAX = '9223372036854775807';

function isPositiveInt64(value, minDigits) {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,19}$/.test(raw)) return false;
  const normalized = raw.replace(/^0+/, '');
  if (!normalized || normalized.length < minDigits) return false;
  return normalized.length < 19 || normalized <= INT64_MAX;
}

export function isShopeeShopId(value) {
  return isPositiveInt64(value, 1);
}

export function isShopeeItemId(value) {
  return isPositiveInt64(value, 8);
}