import { db, config } from 'hatchable';
import { eligiblePublication, claimPublication } from 'lib/delivery.js';
import { sendWhatsAppChannelText } from 'lib/whatsapp-channel.js';

export const access = 'scheduler';
export const methods = ['POST'];

const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);

export default async function(req, res) {
  const origin = String(await config.get('public_app_url') || 'https://radar-promo-brasil.hatchable.site').replace(/\/$/, '');
  const rows = (await db.query(`
    SELECT p.id, p.content_type AS "contentType", p.account_id AS "accountId",
      p.message, p.attempts, o.affiliate_url AS "affiliateUrl",
      o.coupon_code AS "couponCode", o.coupon_url AS "couponUrl",
      g.external_id AS "groupExternalId"
    FROM publications p
    LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
    JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
    WHERE p.status IN ('READY','RETRY')
      AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
      AND g.status='ACTIVE' AND g.platform='WHATSAPP'
      AND g.whatsapp_destination_type='CHANNEL'
      AND NULLIF(trim(g.external_id),'') IS NOT NULL
      AND ${eligiblePublication}
    ORDER BY p.priority DESC,p.created_at
    LIMIT 20
  `)).rows;

  let processed = 0, published = 0, failed = 0, unconfirmed = 0, waitingConnection = 0;
  for (const item of rows) {
    const claim = await claimPublication(db, item.id, item.accountId);
    if (!claim) continue;
    processed++;
    try {
      const trackingUrl = origin + '/api/r/' + encodeURIComponent(item.id);
      const originalLink = String(item.affiliateUrl || '').trim();
      const keepShort = /^https:\/\/(?:lmdee\.link|meli\.la|amzn\.to|s\.shopee\.com\.br|shope\.ee|ali\.ski)(?:\/|$)/i.test(originalLink);
      const effectiveLink = keepShort ? originalLink : trackingUrl;
      let message = String(item.message || '').trim();
      if (originalLink && message.includes(originalLink)) message = message.split(originalLink).join(effectiveLink);
      const couponUrl = String(item.couponUrl || '').trim();
      if (item.couponCode && couponUrl && !message.includes(couponUrl)) {
        message += String.fromCharCode(10, 10) + '🎟️ Cupom: ' + String(item.couponCode).trim() + String.fromCharCode(10) + 'Resgate: ' + couponUrl;
      }
      const result = await sendWhatsAppChannelText({
        channel: item.groupExternalId,
        message,
        publicationId: item.id
      });
      if (result.status === 'WAITING_CONFIRMATION') {
        await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message=$3 WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$4",
          [item.id, item.accountId, 'Entrega incerta no Canal do WhatsApp. Confira o canal antes de reenviar.', claim.dispatchToken]);
        unconfirmed++;
      } else {
        await db.query("UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,external_message_id=$3 WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$4",
          [item.id, item.accountId, clean(result.externalMessageId || ''), claim.dispatchToken]);
        published++;
      }
    } catch (error) {
      const code = String(error?.code || '');
      const status = code === 'SETUP_REQUIRED' || code === 'WHATSAPP_API_UNAVAILABLE' ? 'WAITING_CONNECTION' : (Number(item.attempts || 0) < 3 ? 'RETRY' : 'FAILED');
      const message = status === 'WAITING_CONNECTION'
        ? 'Configure a API do Canal do WhatsApp e valide a conexão antes de ativar a publicação.'
        : clean(error?.message || 'Falha ao publicar no Canal do WhatsApp.');
      await db.query('UPDATE publications SET status=$3,error_message=$4,next_attempt_at=now()+interval \'15 minutes\' WHERE id=$1 AND account_id=$2 AND status=\'DISPATCHING\' AND dispatch_token=$5',
        [item.id, item.accountId, status, message, claim.dispatchToken]);
      if (status === 'WAITING_CONNECTION') waitingConnection++; else failed++;
    }
  }
  return res.json({ processed, published, failed, unconfirmed, waitingConnection });
}
