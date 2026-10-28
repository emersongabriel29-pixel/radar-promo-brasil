import { config } from 'hatchable';
import { createMercadoLivreAffiliateUrl, mercadoLivreAffiliateMetadata } from '../../lib/mercadolivre-affiliate.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);

async function getSessionConfig() {
  const tag = clean(await config.get('MELI_AFFILIATE_TAG'), 200);
  const rawCookies = String(await config.get('MELI_AFFILIATE_COOKIES_JSON') || '');
  if (!tag || !rawCookies) return null;
  let cookies;
  try { cookies = JSON.parse(rawCookies); } catch {
    throw Object.assign(new Error('MELI_AFFILIATE_COOKIES_JSON precisa conter um array JSON de cookies.'), { status: 412 });
  }
  if (!Array.isArray(cookies)) throw Object.assign(new Error('A configuração de cookies precisa ser um array JSON.'), { status: 412 });
  return { tag, cookies };
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a geração de links.' });
  if (req.method === 'GET') {
    const configured = Boolean(clean(await config.get('MELI_AFFILIATE_TAG'), 200) && String(await config.get('MELI_AFFILIATE_COOKIES_JSON') || ''));
    return res.json({
      provider: 'MERCADOLIVRE',
      configured,
      status: configured ? 'EXPERIMENTAL_CONFIGURED_NOT_VERIFIED' : 'NOT_CONFIGURED',
      publicationEnabled: false,
      metadata: mercadoLivreAffiliateMetadata,
      requiredSecrets: ['MELI_AFFILIATE_TAG', 'MELI_AFFILIATE_COOKIES_JSON'],
      note: 'Geração experimental sob demanda. Não publica ofertas automaticamente; a sessão pode expirar e o endpoint não é uma API pública oficial.'
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const session = await getSessionConfig();
    if (!session) return res.status(412).json({ error: 'Configure MELI_AFFILIATE_TAG e MELI_AFFILIATE_COOKIES_JSON nos segredos do servidor.' });
    const affiliateUrl = await createMercadoLivreAffiliateUrl({
      productUrl: clean(req.body?.productUrl, 2000),
      tag: session.tag,
      cookies: session.cookies
    });
    return res.json({
      ok: true,
      provider: 'MERCADOLIVRE',
      affiliateUrl,
      created: true,
      trackingVerified: false,
      published: false,
      publicationEnabled: false,
      note: 'Link retornado pelo gerador autenticado. Confirme produto e rastreamento antes de aprovar a oferta.'
    });
  } catch (error) {
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 502;
    return res.status(status).json({ error: clean(error?.message || 'Falha ao gerar link de afiliado.', 240), published: false });
  }
}
