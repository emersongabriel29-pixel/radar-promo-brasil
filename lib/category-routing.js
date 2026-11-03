const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const CANONICAL_IDS = {
  'moda e beleza': 'cat-beleza',
  'bebe e criancas': 'cat-bebes',
  'pet': 'cat-pet',
  'ofertas gerais': 'cat-gerais'
};

/** Resolve duplicate category labels deterministically, preferring stable Radar IDs. */
export function resolveCanonicalCategory(rows = [], categoryName = '') {
  const wanted = normalize(categoryName);
  const canonicalId = CANONICAL_IDS[wanted];
  const list = Array.isArray(rows) ? rows : [];
  if (canonicalId) {
    const canonical = list.find(row => String(row.id) === canonicalId);
    if (canonical) return canonical;
  }
  const exact = list.filter(row => normalize(row.name) === wanted);
  if (exact.length) {
    return exact.sort((a, b) => {
      const aStable = String(a.id || '').startsWith('cat-') ? 0 : 1;
      const bStable = String(b.id || '').startsWith('cat-') ? 0 : 1;
      return aStable - bStable || String(a.id).localeCompare(String(b.id));
    })[0];
  }
  return list.find(row => String(row.id) === 'cat-gerais')
    || list.filter(row => normalize(row.name).includes('gerais'))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0]
    || null;
}
