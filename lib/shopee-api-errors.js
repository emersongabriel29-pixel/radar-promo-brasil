export function isRetryableShopeeErrorCode(code, attempt = 0) {
  return ['10000', '10030'].includes(String(code || '')) && Number(attempt) < 2;
}

export function shopeeRetryDelay(attempt = 0) {
  return Number(attempt) <= 0 ? 1200 : 2800;
}
