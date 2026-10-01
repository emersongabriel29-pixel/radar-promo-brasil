import { db,scheduler } from 'hatchable';
import { eligiblePublication } from 'lib/delivery.js';
import {recoverRecurrences} from 'lib/recurrences.js';
import {runMonitors} from 'lib/monitoring.js';
import {runRetention} from 'lib/privacy.js';
export const access='scheduler';
export const methods=['POST'];
export default async function(req,res){
  const recurrence=await recoverRecurrences(),monitoring=await runMonitors(),retention=await runRetention();
  const due=(await db.query(`SELECT p.id,p.account_id FROM publications p LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.status='SCHEDULED' AND p.scheduled_at<=now() AND g.status='ACTIVE' AND NULLIF(trim(g.external_id),'') IS NOT NULL AND ${eligiblePublication} ORDER BY p.priority DESC,p.scheduled_at LIMIT 100`)).rows;
  for(const row of due)await db.query("UPDATE publications SET status='READY' WHERE id=$1 AND account_id=$2 AND status='SCHEDULED'",[row.id,row.account_id]);
  const recovered=await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Envio interrompido. Confira o destino antes de reenviar.' WHERE status='DISPATCHING' AND last_attempt_at<now()-interval '20 minutes' RETURNING id,account_id");
  const waiting=await db.query("UPDATE publications p SET status='WAITING_CONNECTION',error_message='Informe o ID oficial do grupo para envio automático' FROM promo_groups g WHERE p.group_id=g.id AND p.account_id=g.account_id AND p.status IN ('READY','RETRY') AND NULLIF(trim(g.external_id),'') IS NULL RETURNING p.id,p.account_id");
  await db.query("UPDATE publications p SET status='READY',error_message=NULL FROM promo_groups g WHERE p.group_id=g.id AND p.account_id=g.account_id AND p.status='WAITING_CONNECTION' AND g.status='ACTIVE' AND NULLIF(trim(g.external_id),'') IS NOT NULL");
  if(due.length)await scheduler.now('/api/jobs/telegram');
  await db.query('DELETE FROM marketplace_oauth_states WHERE expires_at<now()');
  return res.json({ready:due.length,recovered:recovered.rows.length,waitingConnection:waiting.rows.length,recurrence,monitoring,retention});
}
