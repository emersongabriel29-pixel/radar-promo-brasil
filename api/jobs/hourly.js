import { db } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function(req, res) {
  const due = await db.query("SELECT id FROM publications WHERE status='SCHEDULED' AND scheduled_at <= now() ORDER BY scheduled_at LIMIT 50");
  for (const row of due.rows) {
    await db.query("UPDATE publications SET status='READY' WHERE id=$1 AND status='SCHEDULED'", [row.id]);
  }
  const recovered=await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message='Tempo de envio excedido',next_attempt_at=now()+interval '15 minutes' WHERE status='DISPATCHING' AND last_attempt_at<now()-interval '20 minutes' RETURNING id");
  const waiting=await db.query("UPDATE publications p SET status='WAITING_CONNECTION',error_message='Informe o ID oficial do grupo para envio automático' FROM promo_groups g WHERE p.group_id=g.id AND p.status IN ('READY','RETRY') AND g.external_id IS NULL RETURNING p.id");
  await db.query("INSERT INTO activity_log(event_type,title,details,status) VALUES('SCHEDULER','Fila verificada',$1,'SUCCESS')", [String(due.rows.length) + ' liberada(s), '+recovered.rows.length+' recuperada(s), '+waiting.rows.length+' aguardando conexão.']);
  return res.json({ ready: due.rows.length,recovered:recovered.rows.length,waitingConnection:waiting.rows.length });
}
