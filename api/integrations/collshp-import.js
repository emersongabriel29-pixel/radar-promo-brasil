import { fetchCollshpPage, parseCollshpHtml } from 'lib/collshp.js';

export const access = 'member';
export const methods = ['POST'];

export default async function (req, res) {
  if (!req.member) return res.status(401).json({ ok: false, error: 'Entre para continuar.' });
  try {
    const page = await fetchCollshpPage(req.body?.url);
    const parsed = parseCollshpHtml(page.html, page.url);
    return res.json({ ok: true, ...parsed, totalCount: parsed.products.length, readOnly: true });
  } catch (error) {
    const status = Number(error?.status) || 502;
    return res.status(status).json({ ok: false, error: String(error?.message || 'Não foi possível consultar a vitrine.').slice(0, 220) });
  }
}
