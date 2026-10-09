import { db, scheduler } from 'hatchable';
import { calculateRadarScore } from './radar.js';
import { message } from './automation.js';
import { httpsUrl, mediaUrl, marketplaceName } from './validation.js';

export async function evaluateMatches(accountId) {
  const rules = (await db.query("SELECT * FROM autopilot_rules WHERE account_id=$1 AND status='ACTIVE' ORDER BY min_score DESC,updated_at DESC", [accountId])).rows;
  const offers = (await db.query("SELECT * FROM offers WHERE account_id=$1 AND status='APPROVED' ORDER BY COALESCE(radar_score,score,35) DESC,created_at DESC LIMIT 100", [accountId])).rows;
  const matches = [];
  for (const offer of offers) {
    const radar = calculateRadarScore({ currentPrice: offer.current_price, originalPrice: offer.original_price, lowestPrice: offer.price_lowest, averagePrice: offer.price_average, historyCount: offer.price_history_count, title: offer.title, coupon: Boolean(offer.coupon_code || offer.coupon_url) });
    const discount = offer.original_price > offer.current_price ? Math.round((offer.original_price - offer.current_price) * 100 / offer.original_price) : 0;
    const matchedRules = rules.filter(rule => radar.score >= rule.min_score && discount >= rule.min_discount && (!rule.max_price || offer.current_price <= rule.max_price) && (!rule.require_price_history || offer.price_history_count >= 3) && (!rule.category_id || rule.category_id === offer.category_id));
    await db.query('UPDATE offers SET radar_score=$1,radar_reasons=$2,radar_updated_at=now() WHERE id=$3 AND account_id=$4', [radar.score, radar.reasons.join(' • '), offer.id, accountId]);
    if (matchedRules.length) matches.push({ offer, radar, discount, matchedRules });
  }
  return { rules, matches, evaluated: offers.length };
}

export async function enqueueMatches(accountId, requestedOfferId = '') {
  const { matches, evaluated } = await evaluateMatches(accountId);
  const active = new Set((await db.query("SELECT marketplace FROM marketplace_rules WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(affiliate_tag),'') IS NOT NULL", [accountId])).rows.map(r => r.marketplace));
  const settings = (await db.query("SELECT timezone FROM account_settings WHERE account_id=$1", [accountId])).rows[0];
  const timezone = settings?.timezone || 'America/Sao_Paulo';
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let queued = 0, telegramQueued = 0, whatsappQueued = 0, blockedAffiliate = 0;
  const results = [];
  for (const item of matches.filter(x => !requestedOfferId || x.offer.id === requestedOfferId)) {
    const offer = item.offer, rule = item.matchedRules[0];
    if (!mediaUrl(offer.image_url) || !httpsUrl(offer.affiliate_url)) { results.push({ offer_id: offer.id, status: 'INVALID_MEDIA' }); continue; }
    const marketplace = marketplaceName(offer.source);
    // Auto-publication requires a validated affiliate method; a URL alone cannot prove commission credit.
    if (!active.has(marketplace)) { blockedAffiliate++; results.push({ offer_id: offer.id, status: 'AFFILIATE_REQUIRED' }); continue; }
    const groups = (await db.query("SELECT id,platform FROM (SELECT id,platform,row_number() OVER(PARTITION BY platform ORDER BY CASE WHEN category_id=$2 THEN 0 ELSE 1 END,id) AS position FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(external_id),'') IS NOT NULL AND (platform<>'WHATSAPP' OR whatsapp_destination_type='GROUP') AND (category_id=$2 OR category_id IS NULL)) ranked WHERE position=1", [accountId, offer.category_id])).rows;
    const sentGroups = [];
    for (const group of groups) {
      const key = `radar:${offer.id}:${group.id}:${day}`;
      const transaction = await db.transaction([
        { sql: 'SELECT id FROM accounts WHERE id=$1 FOR UPDATE', params: [accountId] },
        { sql: `INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url,mode,priority,idempotency_key,image_storage_key)
          SELECT $1,$2,$3,$4,'READY',$5,$6,'SMART',$7,$8,$12
          WHERE EXISTS(SELECT 1 FROM accounts WHERE id=$2 AND status='ACTIVE')
          AND (SELECT count(*) FROM publications WHERE account_id=$2 AND created_at>=(date_trunc('day',now() AT TIME ZONE $9) AT TIME ZONE $9))<$10
          AND NOT EXISTS(SELECT 1 FROM publications WHERE account_id=$2 AND offer_id=$3 AND group_id=$4 AND
            (created_at>=(date_trunc('day',now() AT TIME ZONE $9) AT TIME ZONE $9) OR created_at>now()-($11::text||' minutes')::interval))
          ON CONFLICT DO NOTHING RETURNING id`,
          params: [crypto.randomUUID(), accountId, offer.id, group.id, message(offer), offer.image_url, item.radar.score, key, timezone, rule.max_publications_per_day, rule.cooldown_minutes,offer.image_storage_key] }
      ]);
      if (!transaction.results[1].rows.length) continue;
      queued++; sentGroups.push(group.id);
      if (group.platform === 'TELEGRAM') telegramQueued++; else whatsappQueued++;
    }
    results.push({ offer_id: offer.id, status: sentGroups.length ? 'PUBLISHED_TO_QUEUE' : groups.length ? 'LIMIT_OR_COOLDOWN' : 'NO_DESTINATION', groups: sentGroups, score: item.radar.score, reasons: item.radar.reasons });
  }
  if (telegramQueued) await scheduler.now('/api/jobs/telegram');
  return { published: queued, queued, evaluated, telegramQueued, whatsappQueued, blockedAffiliate, results };
}
