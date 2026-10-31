export function isShopeeShopId(value) {
  return /^\d{1,18}$/.test(String(value ?? '').trim());
}

export function isShopeeItemId(value) {
  return /^\d{8,18}$/.test(String(value ?? '').trim());
}
