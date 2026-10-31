export function normalizeShopeeDatafeedId(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{1,24})_(FULL|DELTA)_(\d{4})-?(\d{2})-?(\d{2})$/i);
  if (!match) return null;
  const year = Number(match[3]), month = Number(match[4]), day = Number(match[5]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return match[1] + '_' + match[2].toUpperCase() + '_' + match[3] + match[4] + match[5];
}