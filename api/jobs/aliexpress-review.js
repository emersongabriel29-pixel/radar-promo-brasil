import { db } from 'hatchable';
import { offerScore } from 'lib/automation.js';
import { enqueueMatches } from 'lib/autopilot.js';
import { isAdultProduct, isMedicationProduct } from 'lib/product-safety.js';
// Medication and anti-allergy products are rejected before scoring or publication.

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
 * Auto-approves offers with factual product identity, current price and a valid affiliate destination.
 */
export default async function handler(req, res) {
  const rows = (await db.query(
    "SELECT id,account_id,title,original_price,current_price,discount_percent,affiliate_url,image_url,product_url,status,classification_reason FROM offers WHERE source='ALIEXPRESS' AND status='PENDING' AND COALESCE(classification_reason,'')<>'MEDICATION_PUBLICATION_EXCLUDED' AND COALESCE(validation_status,'') IN ('PENDING','PENDING_REVIEW','VALIDATED','NEEDS_REVIEW','') ORDER BY COALESCE(radar_score,score,0) DESC, score DESC, created_at ASC LIMIT 30"
  )).rows;
  const result = { ok: true, scanned: rows.length, validated: 0, approved: 0, needsReview: 0, medicationExcluded: 0, providerRestricted: 0, rejected: 0, unchanged: 0, failed: 0, publicationTriggered: false, queued: 0, telegramQueued: 0, whatsappQueued: 0, messagesSent: 0 };
  const approvedAccounts = new Set();
  for (const offer of rows) {
    try {
      if (isMedicationProduct({title:offer.title,productUrl:offer.product_url})) {
        const safetyMessage = 'Produto bloqueado pela política de segurança: medicamento ou antialérgico.';
        await db.query("UPDATE offers SET status='REJECTED',validation_status='REJECTED',classification_reason='MEDICATION_PUBLICATION_EXCLUDED',message=$1,updated_at=now() WHERE id=$2 AND account_id=$3 AND status='PENDING'",[safetyMessage,offer.id,offer.account_id]);
        result.medicationExcluded++;
        result.rejected++;
        continue;
      }
      const original = Number(offer.original_price), current = Number(offer.current_price);
      const discount = original > current && original > 0 ? Math.round((original - current) * 100 / original) : 0;
      let reason = '';
      if (!String(offer.title || '').trim()) reason = 'Título ausente';
      else if (isAdultProduct({title:offer.title,productUrl:offer.product_url})) reason = 'RESTRICAO_EXTERNA_ALIEXPRESS_ADULT_ADVERTISING';
      else if (!isHttps(offer.affiliate_url) || !isAliExpressUrl(offer.product_url)) reason = 'Link de afiliado ou produto AliExpress ausente/inválido';
      else if (!Number.isSafeInteger(current) || current <= 0) reason = 'Preço atual ausente ou inválido';
      else if (discount < 10) reason = 'Desconto inferior a 10%; requer revisão humana';
      if (reason) {
        await db.query(
          reason === 'RESTRICAO_EXTERNA_ALIEXPRESS_ADULT_ADVERTISING'
            ? "UPDATE offers SET status='PROVIDER_RESTRICTED',validation_status='PROVIDER_RESTRICTED',discount_percent=$1,classification_reason=$2,updated_at=now() WHERE id=$3 AND account_id=$4 AND status='PENDING'"
            : "UPDATE offers SET validation_status='NEEDS_REVIEW',discount_percent=$1,classification_reason=$2,updated_at=now() WHERE id=$3 AND account_id=$4 AND status='PENDING'",
          [discount, reason, offer.id, offer.account_id]
        );
        if (reason === 'RESTRICAO_EXTERNA_ALIEXPRESS_ADULT_ADVERTISING') result.providerRestricted++;
        else result.needsReview++;
        continue;
      }
      const score = offerScore({ title: offer.title, currentPrice: Math.round(current), originalPrice: Math.round(original) });
      await db.query(
        "UPDATE offers SET status='APPROVED',validation_status='VALIDATED',discount_percent=$1,score=COALESCE(radar_score,$2),radar_score=COALESCE(radar_score,$2),classification_reason=COALESCE(classification_reason,$3),updated_at=now() WHERE id=$4 AND account_id=$5 AND status='PENDING'",
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
      await db.query("UPDATE publications p SET priority=GREATEST(COALESCE(p.priority,0),COALESCE(o.radar_score,o.score,0)) FROM offers o WHERE p.offer_id=o.id AND p.account_id=o.account_id AND p.account_id=$1 AND o.source='ALIEXPRESS' AND p.status IN ('READY','RETRY','SCHEDULED')", [accountId]);
    } catch (error) {
      result.failed++;
      console.error('AliExpress automatic publication queue failed', String(error?.code || error?.name || 'ERROR').slice(0, 60));
    }
  }
  result.ok = result.failed === 0;
  return res.json(result);
}