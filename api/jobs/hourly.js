import { db,scheduler } from 'hatchable';
import { eligiblePublication } from 'lib/delivery.js';
import {recoverRecurrences} from 'lib/recurrences.js';
import {runMonitors} from 'lib/monitoring.js';
import {runRetention} from 'lib/privacy.js';
export const access='scheduler';
export const methods=['POST'];
export default async function(req,res){
  const recurrence=await recoverRecurrences(),monitoring=await runMonitors(),retention=await runRetention();
  // Marketplace ingestion runs independently every hour in /api/jobs/marketplace-ingestion.
  const lomadee={ok:true,scheduledSeparately:true};
  const shopee={ok:true,scheduledSeparately:true};
  let lomadeeReconcile={ok:true,accounts:0,activeLinksListed:0,existingOffers:0,linksVerified:0,checked:0,pricesVerified:0,priceMismatch:0,productNotFound:0,blockedMedication:0,skippedRecent:0,failed:0};
  try { lomadeeReconcile=await scheduler.now('/api/jobs/lomadee-reconcile'); }
  catch(error) { lomadeeReconcile={ok:false,error:String(error?.code||error?.name||'ERROR').slice(0,60)}; console.error('hourly lomadee reconcile failed',lomadeeReconcile.error); }
  // Recovery path for Mercado Livre notification events if immediate scheduling was unavailable.
  let meliNotifications={ok:true,scanned:0,processed:0,updatedOffers:0,unsupported:0,failed:0};
  try { meliNotifications=await scheduler.now('/api/jobs/mercadolivre-notifications'); }
  catch(error) { console.error('hourly meli notification recovery failed', error.code || error.name); }
  const due=(await db.query(`SELECT p.id,p.account_id FROM publications p LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.status='SCHEDULED' AND p.scheduled_at<=now() AND g.status='ACTIVE' AND NULLIF(trim(g.external_id),'') IS NOT NULL AND ${eligiblePublication} ORDER BY p.priority DESC,p.scheduled_at LIMIT 100`)).rows;
  for(const row of due)await db.query("UPDATE publications SET status='READY' WHERE id=$1 AND account_id=$2 AND status='SCHEDULED'",[row.id,row.account_id]);
  const recovered=await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Envio interrompido. Confira o destino antes de reenviar.' WHERE status='DISPATCHING' AND last_attempt_at<now()-interval '20 minutes' RETURNING id,account_id");
  const waiting=await db.query("UPDATE publications p SET status='WAITING_CONNECTION',error_message='Informe o ID oficial do grupo para envio automático' FROM promo_groups g WHERE p.group_id=g.id AND p.account_id=g.account_id AND p.status IN ('READY','RETRY') AND NULLIF(trim(g.external_id),'') IS NULL RETURNING p.id,p.account_id");
  await db.query("UPDATE publications p SET status='READY',error_message=NULL FROM promo_groups g WHERE p.group_id=g.id AND p.account_id=g.account_id AND p.status='WAITING_CONNECTION' AND g.status='ACTIVE' AND NULLIF(trim(g.external_id),'') IS NOT NULL");
  // Hourly safety wake-up: resume eligible backlog if a previous one-shot could not be armed.
  const pendingTelegram=(await db.query(`
    SELECT 1 FROM publications p
    LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
    JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
    WHERE p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
      AND g.status='ACTIVE' AND g.platform='TELEGRAM' AND NULLIF(trim(g.external_id),'') IS NOT NULL
      AND ${eligiblePublication}
    LIMIT 1
  `)).rows.length>0;
  if(due.length||pendingTelegram)await scheduler.now('/api/jobs/telegram');
  await db.query('DELETE FROM marketplace_oauth_states WHERE expires_at<now()');
  return res.json({ready:due.length,recovered:recovered.rows.length,waitingConnection:waiting.rows.length,recurrence,monitoring,retention,meliNotifications,lomadee,shopee,lomadeeReconcile});
}
