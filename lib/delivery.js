// Applied to READY and RETRY too, so manual/automatic queues obey the same window.
export const eligiblePublication = `
  EXISTS(SELECT 1 FROM accounts a WHERE a.id=p.account_id AND a.status='ACTIVE')
  AND ((p.content_type='PROMOTION' AND EXISTS(SELECT 1 FROM offers source_offer WHERE source_offer.id=p.offer_id AND source_offer.account_id=p.account_id AND source_offer.status IN ('APPROVED','PUBLISHED')))
    OR (p.content_type='MESSAGE' AND (EXISTS(SELECT 1 FROM schedules source_schedule WHERE source_schedule.id=p.schedule_id AND source_schedule.account_id=p.account_id AND source_schedule.status IN ('ACTIVE','COMPLETED'))
      OR EXISTS(SELECT 1 FROM offers source_offer WHERE source_offer.id=p.offer_id AND source_offer.account_id=p.account_id AND source_offer.status IN ('APPROVED','PUBLISHED')))))
  AND (p.offer_id IS NULL OR EXISTS(SELECT 1 FROM offers verified_offer
    WHERE verified_offer.id=p.offer_id AND verified_offer.account_id=p.account_id
      AND verified_offer.status IN ('APPROVED','PUBLISHED')))
  AND (p.offer_id IS NULL OR EXISTS(SELECT 1 FROM offer_price_history ph
    JOIN offers verified_offer ON verified_offer.id=ph.offer_id AND verified_offer.account_id=ph.account_id
    WHERE ph.account_id=p.account_id AND ph.offer_id=p.offer_id AND ph.source_type='OFFICIAL_API'
      AND ph.verified_at IS NOT NULL AND ph.verified_at>now()-interval '24 hours'
      AND ph.price=verified_offer.current_price
      AND ph.original_price IS NOT DISTINCT FROM verified_offer.original_price
      AND ph.verified_at=(SELECT MAX(ph2.verified_at) FROM offer_price_history ph2
        WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id AND ph2.source_type='OFFICIAL_API')))
  AND (
    NOT EXISTS(SELECT 1 FROM queues q WHERE q.account_id=p.account_id AND q.status='ACTIVE')
    OR EXISTS(SELECT 1 FROM queues q LEFT JOIN account_settings s ON s.account_id=q.account_id
      WHERE q.account_id=p.account_id AND q.status='ACTIVE'
        AND (q.category_id IS NULL OR q.category_id=g.category_id)
        AND (q.start_time=q.end_time
          OR (q.start_time<q.end_time AND (now() AT TIME ZONE COALESCE(s.timezone,'America/Sao_Paulo'))::time BETWEEN q.start_time::time AND q.end_time::time)
          OR (q.start_time>q.end_time AND ((now() AT TIME ZONE COALESCE(s.timezone,'America/Sao_Paulo'))::time>=q.start_time::time OR (now() AT TIME ZONE COALESCE(s.timezone,'America/Sao_Paulo'))::time<=q.end_time::time)))
        AND NOT EXISTS(SELECT 1 FROM publications recent WHERE recent.account_id=p.account_id AND recent.group_id=p.group_id
          AND recent.status='PUBLISHED' AND recent.published_at>now()-(COALESCE(q.interval_minutes,1)::text||' minutes')::interval))
  )
`;

// A preselected Telegram batch has already passed the queue interval check once.
// Recheck all safety and time-window rules per item, but do not let the first item
// in that same batch block the remaining items through the per-group cooldown.
const eligiblePublicationForBatch = eligiblePublication.replace(/\s+AND NOT EXISTS\(SELECT 1 FROM publications recent[\s\S]*?recent\.published_at>now\(\)-\(COALESCE\(q\.interval_minutes,1\)::text\|\|' minutes'\)::interval\)/, '');

export function claimStatements(id,accountId,connectionId=null,candidate=null,batch=false){
  const token=crypto.randomUUID();
  return [
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:`UPDATE publications p SET status='DISPATCHING',attempts=attempts+1,last_attempt_at=now(),connection_id=${candidate||'$3'},dispatch_token=$4
      FROM promo_groups g WHERE p.id=$1 AND p.account_id=$2 AND p.status IN ('READY','RETRY')
      AND g.id=p.group_id AND g.account_id=p.account_id
      AND ${batch?eligiblePublicationForBatch:eligiblePublication} ${candidate?"AND g.platform='WHATSAPP' AND "+candidate+' IS NOT NULL AND $3::text IS NULL':''}
      AND NOT EXISTS(SELECT 1 FROM publications in_flight WHERE in_flight.account_id=p.account_id AND in_flight.group_id=p.group_id AND in_flight.status='DISPATCHING') RETURNING p.id,p.connection_id,p.dispatch_token AS "dispatchToken"`,params:[id,accountId,connectionId,token]}
  ];
}
export async function claimPublication(db, id, accountId, connectionId=null, options={}) {
  // Hatchable applies a project-wide transaction rate limit. Short bounded backoff
  // lets a queued publication survive brief bursts from concurrent integrations.
  const delays = [1000, 2500, 5000, 8000, 10000];
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await db.transaction(claimStatements(id, accountId, connectionId, null, options?.batch===true));
      return result.results[1].rows[0];
    } catch (error) {
      const rateLimited = /rate limit exceeded for db\/transaction/i.test(String(error?.message || ''));
      if (!rateLimited || attempt >= delays.length) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
}