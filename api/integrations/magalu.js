import { db } from 'hatchable';
import { moneyCents, mediaUrl, httpsUrl } from 'lib/validation.js';
import { fingerprint as makeFingerprint } from 'lib/automation.js';
import { formatPromo } from 'lib/promo-message.js';
import { classifyProduct } from 'lib/category-classifier.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

const txt = (v, n = 1200) => String(v ?? '').trim().slice(0, n);
const officialHost = host => host === 'magazinevoce.com.br' || host.endsWith('.magazinevoce.com.br') || host === 'magazineluiza.com.br' || host.endsWith('.magazineluiza.com.br');
function parseMagaluUrl(value) {
  const safe = httpsUrl(value, 2000);
  if (!safe) return null;
  try {
    const url = new URL(safe);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!officialHost(host)) return null;
    return url;
  } catch { return null; }
}
async function getAccount(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
function linkAssessment(url) {
  if (!url) return { valid: false, type: 'INVALID', message: 'Use um link HTTPS de magazinevoce.com.br ou magazineluiza.com.br gerado no Parceiro Magalu.' };
  return {
    valid: true, type: 'MAGALU_PARTNER_LINK',
    message: 'Domínio oficial reconhecido. O Radar não consegue verificar rastreamento ou comissão; confirme que o link foi gerado na sua conta do Parceiro Magalu.'
  };
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração MAGALU.' });
  try {
    const account = await getAccount(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    if (req.method === 'GET') return res.json({
      provider: 'MAGALU',
      mode: 'official_affiliate_center_link_import',
      status: 'MANUAL_LINK_WORKFLOW',
      capabilities: ['validate_official_link_domain', 'create_pending_offer_draft', 'manual_campaign_link_import', 'manual_product_link_import', 'affiliate_tracking_confirmation'],
      unavailableWithoutOfficialAffiliateAPI: ['automated_product_discovery', 'automated_campaign_feed', 'programmatic_link_generation', 'commission_reports', 'conversion_reports'],
      publicationEnabled: false,
      note: 'Não foi confirmada uma API pública de afiliados para o Parceiro Magalu. As APIs do Magalu Devs são voltadas a sellers e operações de marketplace. Use links gerados na sua conta oficial de influenciador.'
    });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const body = req.body || {};
    const action = txt(body.action, 40).toLowerCase();
    if (action === 'validate_link') {
      const affiliateUrl = parseMagaluUrl(body.affiliateUrl);
      const productUrl = body.productUrl ? parseMagaluUrl(body.productUrl) : null;
      if (!affiliateUrl) return res.status(400).json({ error: 'O link de afiliado deve usar HTTPS e o domínio oficial magazinevoce.com.br ou magazineluiza.com.br.' });
      if (body.productUrl && !productUrl) return res.status(400).json({ error: 'O link do produto deve usar HTTPS e magazinevoce.com.br ou magazineluiza.com.br.' });
      return res.json({
        ok: true,
        affiliateLink: linkAssessment(affiliateUrl),
        productLink: productUrl ? { valid: true, host: productUrl.hostname } : null,
        trackingVerified: false,
        publicationEnabled: false,
        note: 'A validação confere apenas o formato e o domínio; não confirma comissões, rastreamento ou disponibilidade do produto.'
      });
    }
    if (action !== 'create_draft') return res.status(400).json({ error: 'Ação inválida. Use validate_link ou create_draft.' });
    const title = txt(body.title, 220);
    const affiliateUrl = parseMagaluUrl(body.affiliateUrl);
    const productUrl = body.productUrl ? parseMagaluUrl(body.productUrl) : null;
    const imageUrl = txt(body.imageUrl, 1200);
    const current = moneyCents(body.currentPrice);
    const original = body.originalPrice === '' || body.originalPrice == null ? null : moneyCents(body.originalPrice);
    let categoryId = txt(body.categoryId, 80) || null;
    if (!title || !affiliateUrl || !body.affiliateLinkConfirmed) return res.status(400).json({ error: 'Informe o título, um link oficial e confirme que ele foi gerado na sua conta do Parceiro Magalu.' });
    if (body.productUrl && !productUrl) return res.status(400).json({ error: 'O link do produto precisa ser HTTPS e pertencer a magazinevoce.com.br ou magazineluiza.com.br.' });
    if (!Number.isFinite(current) || current <= 0 || original !== null && (!Number.isFinite(original) || original < current)) return res.status(400).json({ error: 'Informe preços válidos; o preço original, se preenchido, deve ser maior ou igual ao atual.' });
    if (!mediaUrl(imageUrl)) return res.status(400).json({ error: 'Informe uma URL HTTPS válida para a imagem do produto.' });
    if (categoryId && !(await db.query('SELECT id FROM categories WHERE id=$1 AND account_id=$2', [categoryId, account.id])).rows.length) return res.status(400).json({ error: 'Categoria inválida para esta conta.' });
    const classified = classifyProduct({ title, description: body.description, sourceCategory: body.sourceCategory });
    if (!categoryId) {
      const match = await db.query('SELECT id FROM categories WHERE account_id=$1 AND lower(name)=lower($2) LIMIT 1', [account.id, classified.category]);
      const fallback = match.rows[0] || (await db.query('SELECT id FROM categories WHERE account_id=$1 AND lower(name)=lower($2) LIMIT 1', [account.id, 'Ofertas gerais'])).rows[0];
      categoryId = fallback?.id || null;
    }
    const categoryName = categoryId ? (await db.query('SELECT name FROM categories WHERE id=$1 AND account_id=$2', [categoryId, account.id])).rows[0]?.name || '' : '';
    const centsCurrent = Math.round(current);
    const centsOriginal = original == null ? null : Math.round(original);
    const fp = await makeFingerprint({ title, source: 'MAGALU', productUrl: productUrl?.toString() || affiliateUrl.toString(), affiliateUrl: affiliateUrl.toString() });
    const promo = formatPromo({
      title, source: 'MAGALU', category: categoryName, currentPrice: centsCurrent,
      originalPrice: centsOriginal || 0, affiliateUrl: affiliateUrl.toString(),
      template: 'IMPORTED'
    });
    const score = Math.max(35, Math.min(98, 45 + (centsOriginal > centsCurrent ? Math.round((centsOriginal - centsCurrent) * 100 / centsOriginal) : 0) + 8));
    const created = await db.query(
      "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible) VALUES($1,$2,$3,'MAGALU',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'PENDING',$12,$13,'PENDING','MANUAL',false) ON CONFLICT DO NOTHING RETURNING id",
      [crypto.randomUUID(), account.id, title, centsOriginal, centsCurrent, categoryId, affiliateUrl.toString(), imageUrl, productUrl?.toString() || null, centsOriginal > centsCurrent ? Math.round((centsOriginal - centsCurrent) * 100 / centsOriginal) : 0, score, promo.message, fp]
    );
    if (!created.rows.length) return res.status(409).json({ error: 'Esta oferta já está cadastrada ou duplicada.' });
    await db.query('UPDATE offers SET subcategory=$1,classification_tags=$2::jsonb,classification_confidence=$3,classification_status=$4,classification_reason=$5,source_category=$6 WHERE id=$7 AND account_id=$8',[classified.subcategory,JSON.stringify(classified.tags),classified.confidence,body.categoryId?'MANUAL':classified.needsReview?'REVIEW':'AUTO',body.categoryId?'manual_override':classified.reason,txt(body.sourceCategory,200)||null,created.rows[0].id,account.id]);
    return res.json({
      ok: true, offerId: created.rows[0].id, source: 'MAGALU', status: 'PENDING',
      validationStatus: 'PENDING', storefrontVisible: false, published: false,
      affiliateLinkType: linkAssessment(affiliateUrl).type, trackingVerified: false,
      message: 'Rascunho Parceiro Magalu criado. Revise preço, imagem e rastreamento; a oferta não foi aprovada nem publicada.'
    });
  } catch (error) {
    console.error('integrations/magalu', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60), status: Number(error?.status) || 500 }));
    return res.status(Number(error?.status) || 500).json({ error: 'Não foi possível preparar a oferta Parceiro Magalu. Confira os campos e tente novamente.' });
  }
}