import { db } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function(req, res) {
  const due = await db.query("SELECT p.id,p.account_id FROM publications p LEFT JOIN promo_groups g ON g.id=p.group_id LEFT JOIN account_settings s ON s.account_id=p.account_id WHERE p.status='SCHEDULED' AND p.scheduled_at <= now() AND (NOT EXISTS(SELECT 1 FROM queues q WHERE q.account_id=p.account_id AND q.status='ACTIVE') OR EXISTS(SELECT 1 FROM queues q WHERE q.account_id=p.account_id AND q.status='ACTIVE' AND (q.category_id IS NULL OR q.category_id=g.category_id) AND (now() AT TIME ZONE COALESCE(s.timezone,'America/Sao_Paulo'))::time BETWEEN q.start_time::time AND q.end_time::time)) ORDER BY p.priority DESC,p.scheduled_at LIMIT 50");
  for (const row of due.rows) {
    await db.query("UPDATE publications SET status='READY' WHERE id=$1 AND status='SCHEDULED'", [row.id]);
  }
  const recovered=await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message='Tempo de envio excedido',next_attempt_at=now()+interval '15 minutes' WHERE status='DISPATCHING' AND last_attempt_at<now()-interval '20 minutes' RETURNING id,account_id");
  const waiting=await db.query("UPDATE publications p SET status='WAITING_CONNECTION',error_message='Informe o ID oficial do grupo para envio automático' FROM promo_groups g WHERE p.group_id=g.id AND p.account_id=g.account_id AND p.status IN ('READY','RETRY') AND g.external_id IS NULL RETURNING p.id,p.account_id");
  const accounts=[...new Set([...due.rows,...recovered.rows,...waiting.rows].map(x=>x.account_id).filter(Boolean))];
  for(const accountId of accounts)await db.query("INSERT INTO activity_log(account_id,event_type,title,details,status) VALUES($1,'SCHEDULER','Fila verificada',$2,'SUCCESS')",[accountId,String(due.rows.filter(x=>x.account_id===accountId).length)+' liberada(s).']);
  return res.json({ ready: due.rows.length,recovered:recovered.rows.length,waitingConnection:waiting.rows.length });
}
