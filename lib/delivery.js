// Applied to READY and RETRY too, so manual/automatic queues obey the same window.
export const eligiblePublication = `
  EXISTS(SELECT 1 FROM accounts a WHERE a.id=p.account_id AND a.status='ACTIVE')
  AND o.status IN ('APPROVED','PUBLISHED')
  AND (p.scheduled_at IS NULL OR p.scheduled_at<=now())
  AND (NOT EXISTS(SELECT 1 FROM queues q WHERE q.account_id=p.account_id AND q.status='ACTIVE')
    OR EXISTS(SELECT 1 FROM queues q LEFT JOIN account_settings s ON s.account_id=q.account_id
      WHERE q.account_id=p.account_id AND q.status='ACTIVE' AND (q.category_id IS NULL OR q.category_id=g.category_id)
      AND (q.start_time=q.end_time
        OR (q.start_time<q.end_time AND (now() AT TIME ZONE COALESCE(s.timezone,'America/Sao_Paulo'))::time BETWEEN q.start_time::time AND q.end_time::time)
        OR (q.start_time>q.end_time AND ((now() AT TIME ZONE COALESCE(s.timezone,'America/Sao_Paulo'))::time>=q.start_time::time OR (now() AT TIME ZONE COALESCE(s.timezone,'America/Sao_Paulo'))::time<=q.end_time::time)))
      AND NOT EXISTS(SELECT 1 FROM publications recent WHERE recent.account_id=p.account_id AND recent.group_id=p.group_id AND recent.status='PUBLISHED' AND recent.published_at>now()-(q.interval_minutes::text||' minutes')::interval)))`;

export async function claimPublication(db, id, accountId, connectionId=null) {
  const result=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:`UPDATE publications p SET status='DISPATCHING',attempts=attempts+1,last_attempt_at=now(),connection_id=$3
      FROM offers o,promo_groups g WHERE p.id=$1 AND p.account_id=$2 AND p.status IN ('READY','RETRY')
      AND o.id=p.offer_id AND o.account_id=p.account_id AND g.id=p.group_id AND g.account_id=p.account_id
      AND ${eligiblePublication}
      AND NOT EXISTS(SELECT 1 FROM publications in_flight WHERE in_flight.account_id=p.account_id AND in_flight.group_id=p.group_id AND in_flight.status='DISPATCHING') RETURNING p.id`,params:[id,accountId,connectionId]}
  ]);
  return result.results[1].rows[0];
}
