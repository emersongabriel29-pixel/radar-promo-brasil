import { db } from 'hatchable';
import { offerScore } from 'lib/automation.js';

export const access = 'scheduler';
export const methods = ['POST'];

const isHttps = value => {
  try { const url = new URL(String(value || '')); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
};

/**
 * Automated quality gate for AliExpress drafts.
 * Never approves, publishes, queues a message, or contacts a group.
 */
export default async function handler(req, res) {
  const rows = (await db.query(
    "SELECT id,account_id,title,original_price,current_price,discount_percent,affiliate_url,image_url,product_url,status FROM offers WHERE source='ALIEXPRESS' AND status='PENDING' AND COALESCE(validation_status,'') IN ('PENDING','PENDING_REVIEW','') ORDER BY created_at ASC LIMIT 200"
  )).rows;
  const result = { ok: true, scanned: rows.length, validated: 0, rejected: 0, unchanged: 0, failed: 0, publicationTriggered: false, messagesSent: 0 };
  for (const offer of rows) {
    try {
      const original = Number(offer.original_price), current = Number(offer.current_price);
      const discount = original > current && original > 0 ? Math.round((original - current) * 100 / original) : 0;
      let reason = '';
      if (!String(offer.title || '').trim()) reason = 'Título ausente';
      else if (!isHttps(offer.affiliate_url) || !isHttps(offer.product_url) || !isHttps(offer.image_url)) reason = 'Link de afiliado, produto ou imagem HTTPS ausente/inválido';
      else if (!Number.isFinite(current) || !Number.isFinite(original) || current <= 0 || original <= current) reason = 'Preço atual/original inválido ou desconto não verificável';
      // Descontos abaixo de 10% são permitidos; preços ainda precisam ser válidos.
      if (reason) {
        await db.query(
          "UPDATE offers SET validation_status='REJECTED',discount_percent=$1,classification_status='REVIEW',classification_reason=$2,updated_at=now() WHERE id=$3 AND account_id=$4 AND status='PENDING'",
          [discount, reason, offer.id, offer.account_id]
        );
        result.rejected++;
        continue;
      }
      const score = offerScore({ title: offer.title, currentPrice: Math.round(current), originalPrice: Math.round(original) });
      await db.query(
        "UPDATE offers SET validation_status='VALIDATED',discount_percent=$1,score=$2,classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$4 AND account_id=$5 AND status='PENDING'",
        [discount, score, 'Validação automática concluída; aprovação humana ainda obrigatória. Oferta não publicada.', offer.id, offer.account_id]
      );
      result.validated++;
    } catch (error) {
      result.failed++;
      console.error('aliexpress review validation failed', String(error?.code || error?.name || 'ERROR').slice(0, 60));
    }
  }
  result.ok = result.failed === 0;
  return res.json(result);
}