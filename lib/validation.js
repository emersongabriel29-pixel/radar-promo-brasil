export const INTEGER_MAX = 2147483647;

export function moneyCents(value, { optional = false, cents = false } = {}) {
  if (optional && (value === '' || value === null || value === undefined)) return null;
  const normalized = typeof value === 'string' ? value.trim().replace(/^R\$\s*/, '').replace(/\s/g, '') : value;
  const raw = typeof normalized === 'string' && normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.') : normalized;
  const amount = Number(raw);
  const result = Math.round(amount * (cents ? 1 : 100));
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(result) || result > INTEGER_MAX) return NaN;
  return result;
}

export function httpsUrl(value, max = 2000) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > max) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/,'');
    if (host === 'localhost' || !host.includes('.') || /\.(local|localhost|internal)$/.test(host)) return '';
    if (/^(0|10|127)\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return '';
    if (host.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';
    return url.toString();
  } catch { return ''; }
}

export function timeValue(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? '')); }
export function mediaUrl(value) {
  const raw=String(value??'').trim();
  return /^\/uploads\/products\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(raw) ? raw : httpsUrl(raw);
}
export function colorValue(value) { return /^#[a-f\d]{6}$/i.test(String(value ?? '')); }
export function booleanValue(value) { return value === true || value === 'true'; }
export function validTimezone(value) {
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format(); return true; } catch { return false; }
}

export function marketplaceName(value) {
  const v = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (v.includes('MERCADO')) return 'MERCADO_LIVRE';
  if (v.includes('SHOPEE')) return 'SHOPEE';
  if (v.includes('AMAZON')) return 'AMAZON';
  return v;
}
