export const access = 'member';
export const methods = ['GET'];

const BASE = 'https://seller.shopee.com.br/help/api/v3/global_category/list/';
const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

function flattenCategoryRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const path = Array.isArray(row?.path) ? row.path : [];
    for (let index = 0; index < path.length; index++) {
      const node = path[index] || {};
      const id = String(node.category_id ?? '').trim();
      const name = clean(node.category_name, 180);
      if (!/^\d+$/.test(id) || !name) continue;
      const parent = index > 0 ? String(path[index - 1]?.category_id ?? '') : null;
      const pathNames = path.slice(0, index + 1).map(part => clean(part?.category_name, 180)).filter(Boolean);
      map.set(id, {
        categoryId: id,
        name,
        parentCategoryId: parent,
        level: index + 1,
        path: pathNames,
        fullName: pathNames.join(' › '),
        active: row.toggle !== false
      });
    }
    const leafId = String(row?.category_id ?? '').trim();
    if (/^\d+$/.test(leafId) && !map.has(leafId) && row?.category_name) {
      map.set(leafId, { categoryId: leafId, name: clean(row.category_name, 180), parentCategoryId: null, level: 1, path: [clean(row.category_name, 180)], fullName: clean(row.category_name, 180), active: row.toggle !== false });
    }
  }
  return [...map.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para consultar o catálogo de categorias Shopee.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const pageSize = Math.min(100, Math.max(20, Math.floor(Number(req.query?.size) || 100)));
    const requestedPage = Math.min(20, Math.max(1, Math.floor(Number(req.query?.page) || 1)));
    const fetchAll = String(req.query?.all || '').toLowerCase() === 'true';
    const pages = [];
    const allRows = [];
    let total = 0;
    const maxPages = fetchAll ? 20 : 1;
    for (let offset = 0; offset < maxPages; offset++) {
      const page = fetchAll ? offset + 1 : requestedPage;
      const url = BASE + '?page=' + page + '&size=' + pageSize;
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8', 'user-agent': 'Mozilla/5.0 (compatible; RadarPromoBrasil/1.0)' },
        signal: AbortSignal.timeout(10000)
      });
      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('A Shopee retornou uma resposta não JSON no catálogo de categorias.'); }
      if (!response.ok || Number(data?.code) !== 0) throw new Error('Falha ao consultar categorias Shopee (HTTP ' + response.status + ', código ' + clean(data?.code, 30) + ').');
      const rows = Array.isArray(data?.data?.global_cats) ? data.data.global_cats : [];
      total = Number(data?.data?.total) || total;
      allRows.push(...rows);
      pages.push({ page, returned: rows.length });
      if (!fetchAll || !rows.length || allRows.length >= total) break;
    }
    const items = flattenCategoryRows(allRows);
    return res.json({
      source: 'Shopee Seller Center category guide',
      sourceUrl: 'https://seller.shopee.com.br/edu/category-guide',
      items,
      categories: items.length,
      catalogEntries: allRows.length,
      totalCatalogEntries: total,
      pages,
      complete: allRows.length >= total,
      idType: 'SELLER_CATEGORY_ID',
      note: 'IDs deste guia são IDs do catálogo Seller Center. A aceitação de cada ID como productCatId na Open API de Afiliados deve ser validada separadamente; não há conversão presumida.'
    });
  } catch (error) {
    return res.status(502).json({ error: String(error?.message || 'Não foi possível carregar categorias Shopee.').slice(0, 260) });
  }
}