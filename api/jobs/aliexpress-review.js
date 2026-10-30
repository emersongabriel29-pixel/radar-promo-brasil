import { db } from 'hatchable';
import { offerScore } from 'lib/automation.js';
import { enqueueMatches } from 'lib/autopilot.js';
// No internal product-category exclusion.

export const access = 'scheduler';
export const methods = ['POST'];

const isAliExpressUrl = value => {
  try { const url = new URL(String(value || '')); const host = url.hostname.toLowerCase(); return url.protocol === 'https:' && !url.username && !url.password && (host === 'aliexpress.com' || host.endsWith('.aliexpress.com') || host === 'aliexpress.us' || host.endsWith('.aliexpress.us')); }
  catch { return false; }
};

const isHttps = value => {
  try { const url = new URL(String(value || '')); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
};

/**
 * Automated quality gate for AliExpress drafts.
 * Auto-approves only offers that pass hard requirements; only their AliExpress offers enter the automatic publication queue.
 */
export default async function handler(req, res) {
  const rows = (await db.query(
    "SELECT id,account_id,title,original_price,current_price,discount_percent,affiliate_url,image_url,product_url,status,classification_reason FROM offers WHERE source='ALIEXPRESS' AND status='PENDING' AND COALESCE(validation_status,'') IN ('PENDING','PENDING_REVIEW','VALIDATED','') ORDER BY created_at ASC LIMIT 200"
  )).rows;
  const result = { ok: true, scanned: rows.length, validated: 0, approved: 0, needsReview: 0, rejected: 0, unchanged: 0, failed: 0, publicationTriggered: false, queued: 0, telegramQueued: 0, whatsappQueued: 0, messagesSent: 0 };
  const approvedAccounts = new Set();
  for (const offer of rows) {
    try {
      const original = Number(offer.original_price), current = Number(offer.current_price);
      const discount = original > current && original > 0 ? Math.round((original - current) * 100 / original) : 0;
      let reason = '';
      if (!String(offer.title || '').trim()) reason = 'Título ausente';
      else if (!isHttps(offer.affiliate_url) || !isAliExpressUrl(offer.product_url) || !isHttps(offer.image_url)) reason = 'Link de afiliado, produto AliExpress ou imagem HTTPS ausente/inválido';
      else if (!Number.isFinite(current) || !Number.isFinite(original) || current <= 0 || original <= current) reason = 'Preço atual/original inválido ou desconto não verificável';
      // No internal product-category exclusion.
      else if (discount < 10) reason = 'Desconto abaixo do mínimo de 10%';
      if (reason) {
        await db.query(
          "UPDATE offers SET validation_status='REJECTED',discount_percent=$1,classification_status='REVIEW',classification_reason=$2,updated_at=now() WHERE id=$3 AND account_id=$4 AND status='PENDING'",
          [discount, reason, offer.id, offer.account_id]
        );
        result.rejected++;
        continue;
      }
      const qualityReason = String(offer.classification_reason || '');
      if (qualityReason.includes('LOW_COMMISSION') || qualityReason.includes('LOW_RATING')) {
        await db.query(
          "UPDATE offers SET validation_status='NEEDS_REVIEW',discount_percent=$1,classification_status='REVIEW',classification_reason=$2,updated_at=now() WHERE id=$3 AND account_id=$4 AND status='PENDING'",
          [discount, 'Comissão ou avaliação abaixo do limite; exige aprovação humana.', offer.id, offer.account_id]
        );
        result.needsReview++;
        continue;
      }
      const score = offerScore({ title: offer.title, currentPrice: Math.round(current), originalPrice: Math.round(original) });
      await db.query(
        "UPDATE offers SET status='APPROVED',validation_status='VALIDATED',discount_percent=$1,score=$2,classification_status='AUTO',classification_reason=$3,updated_at=now() WHERE id=$4 AND account_id=$5 AND status='PENDING'",
        [discount, score, 'Requisitos automáticos aprovados; elegível para publicação automática AliExpress.', offer.id, offer.account_id]
      );
      result.validated++;
      result.approved++;
      approvedAccounts.add(offer.account_id);
    } catch (error) {
      result.failed++;
      console.error('aliexpress review validation failed', String(error?.code || error?.name || 'ERROR').slice(0, 60));
    }
  }
  for (const accountId of approvedAccounts) {
    try {
      const queued = await enqueueMatches(accountId, '', { source: 'ALIEXPRESS' });
      result.queued += queued.queued || queued.published || 0;
      result.telegramQueued += queued.telegramQueued || 0;
      result.whatsappQueued += queued.whatsappQueued || 0;
      result.publicationTriggered = result.publicationTriggered || (queued.queued || queued.published || 0) > 0;
    } catch (error) {
      result.failed++;
      console.error('AliExpress automatic publication queue failed', String(error?.code || error?.name || 'ERROR').slice(0, 60));
    }
  }
  result.ok = result.failed === 0;
  return res.json(result);
}