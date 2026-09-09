import { db } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function(req, res) {
  const due = await db.query("SELECT p.id FROM publications p LEFT JOIN promo_groups g ON g.id=p.group_id WHERE p.status='SCHEDULED' AND p.scheduled_at <= now() AND (NOT EXISTS(SELECT 1 FROM queues q WHERE q.account_id=p.account_id AND q.status='ACTIVE') OR EXISTS(SELECT 1 FROM queues q WHERE q.account_id=p.account_id AND q.status='ACTIVE' AND (q.category_id IS NULL OR q.category_id=g.category_id) AND localtime BETWEEN q.start_time::time AND q.end_time::time)) ORDER BY p.priority DESC,p.scheduled_at LIMIT 50");
  for (const row of due.rows) {
    await db.query("UPDATE publications SET status='READY' WHERE id=$1 AND status='SCHEDULED'", [row.id]);
  }
  const recovered=await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message='Tempo de envio excedido',next_attempt_at=now()+interval '15 minutes' WHERE status='DISPATCHING' AND last_attempt_at<now()-interval '20 minutes' RETURNING id");
  const waiting=await db.query("UPDATE publications p SET status='WAITING_CONNECTION',error_message='Informe o ID oficial do grupo para envio automático' FROM promo_groups g WHERE p.group_id=g.id AND p.status IN ('READY','RETRY') AND g.external_id IS NULL RETURNING p.id");
  await db.query("INSERT INTO activity_log(event_type,title,details,status) VALUES('SCHEDULER','Fila verificada',$1,'SUCCESS')", [String(due.rows.length) + ' liberada(s), '+recovered.rows.length+' recuperada(s), '+waiting.rows.length+' aguardando conexão.']);
  return res.json({ ready: due.rows.length,recovered:recovered.rows.length,waitingConnection:waiting.rows.length });
}
