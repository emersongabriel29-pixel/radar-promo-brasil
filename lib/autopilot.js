import { db, scheduler } from 'hatchable';
import { calculateRadarScore } from './radar.js';
import { message } from './automation.js';
import { httpsUrl, directImageUrl, marketplaceName } from './validation.js';
import { isMedicationProduct } from './product-safety.js';

export async function evaluateMatches(accountId, sourceFilter = '') {
  const rules = (await db.query("SELECT * FROM autopilot_rules WHERE account_id=$1 AND status='ACTIVE' ORDER BY min_score DESC,updated_at DESC", [accountId])).rows;
  const offers = (await db.query("SELECT * FROM offers WHERE account_id=$1 AND status='APPROVED' AND ($2='' OR source=$2) ORDER BY COALESCE(radar_score,score,35) DESC,created_at DESC LIMIT 100", [accountId, sourceFilter])).rows;
  const matches = [];
  for (const offer of offers) {
    if (isMedicationProduct({ title: offer.title, sourceCategory: offer.source_category, subcategory: offer.subcategory, classification_tags: offer.classification_tags, product_url: offer.product_url })) {
      await db.query("UPDATE offers SET classification_status='REVIEW',classification_reason='MEDICATION_EXCLUDED_FROM_PROMOTION',updated_at=now() WHERE id=$1 AND account_id=$2", [offer.id, accountId]);
      continue;
    }
    const radar = calculateRadarScore({ currentPrice: offer.current_price, originalPrice: offer.original_price, lowestPrice: offer.price_lowest, averagePrice: offer.price_average, historyCount: offer.price_history_count, title: offer.title, coupon: Boolean(offer.coupon_code || offer.coupon_url) });
    const discount = offer.original_price > offer.current_price ? Math.round((offer.original_price - offer.current_price) * 100 / offer.original_price) : 0;
    // The radar score is informational only; publication eligibility uses explicit commercial and safety rules.
    const matchedRules = rules.filter(rule => (!rule.max_price || offer.current_price <= rule.max_price) && (!rule.require_price_history || offer.price_history_count >= 3) && (!rule.category_id || rule.category_id === offer.category_id));
    await db.query('UPDATE offers SET radar_score=$1,radar_reasons=$2,radar_updated_at=now() WHERE id=$3 AND account_id=$4', [radar.score, radar.reasons.join(' • '), offer.id, accountId]);
    if (matchedRules.length) matches.push({ offer, radar, discount, matchedRules });
  }
  return { rules, matches, evaluated: offers.length };
}

export async function enqueueMatches(accountId, requestedOfferId = '', options = {}) {
  const { matches, evaluated } = await evaluateMatches(accountId, options?.source || '');
  const active = new Set((await db.query("SELECT marketplace FROM marketplace_rules WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(affiliate_tag),'') IS NOT NULL", [accountId])).rows.map(r => r.marketplace));
  // Lomadee links are generated server-side through its official shortener; only count the integration after read scopes are validated.
  const validatedAffiliateApis = (await db.query("SELECT marketplace FROM marketplace_api_credentials WHERE account_id=$1 AND status='VALIDATED' AND marketplace='LOMADEE'", [accountId])).rows;
  for (const row of validatedAffiliateApis) active.add(row.marketplace);
  const verifiedPriceOffers = new Set((await db.query("SELECT DISTINCT ph.offer_id FROM offer_price_history ph JOIN offers o ON o.id=ph.offer_id AND o.account_id=ph.account_id WHERE ph.account_id=$1 AND ph.source_type='OFFICIAL_API' AND ph.verified_at IS NOT NULL AND ph.verified_at>now()-interval '24 hours' AND ph.original_price IS NOT NULL AND ph.price=o.current_price AND ph.original_price=o.original_price AND ph.verified_at=(SELECT MAX(ph2.verified_at) FROM offer_price_history ph2 WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id AND ph2.source_type='OFFICIAL_API')", [accountId])).rows.map(row => row.offer_id));
  const existingTelegramOffers = new Set((await db.query("SELECT DISTINCT p.offer_id FROM publications p JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.account_id=$1 AND g.platform='TELEGRAM' AND g.status='ACTIVE' AND p.status IN ('READY','RETRY','DISPATCHING','PUBLISHED')", [accountId])).rows.map(row => row.offer_id));
  const settings = (await db.query("SELECT timezone FROM account_settings WHERE account_id=$1", [accountId])).rows[0];
  const timezone = settings?.timezone || 'America/Sao_Paulo';
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let queued = 0, telegramQueued = 0, whatsappQueued = 0, blockedAffiliate = 0;
  const results = [];
  const requestedMatches = matches.filter(x => !requestedOfferId || x.offer.id === requestedOfferId);
  const blockedPrice = requestedMatches.filter(x => !verifiedPriceOffers.has(x.offer.id)).length;
  for (const item of requestedMatches.filter(x => verifiedPriceOffers.has(x.offer.id)).filter(x => (x.offer.image_storage_key || directImageUrl(x.offer.image_url)) && httpsUrl(x.offer.affiliate_url) && active.has(marketplaceName(x.offer.source)) && !existingTelegramOffers.has(x.offer.id))) {
    const offer = item.offer, rule = item.matchedRules[0];
    if (!(offer.image_storage_key || directImageUrl(offer.image_url)) || !httpsUrl(offer.affiliate_url)) { results.push({ offer_id: offer.id, status: 'INVALID_MEDIA' }); continue; }
    const marketplace = marketplaceName(offer.source);
    // Auto-publication requires a validated affiliate method; a URL alone cannot prove commission credit.
    if (!active.has(marketplace)) { blockedAffiliate++; results.push({ offer_id: offer.id, status: 'AFFILIATE_REQUIRED' }); continue; }
    const groups = (await db.query("SELECT id,platform FROM (SELECT id,platform,row_number() OVER(PARTITION BY platform ORDER BY CASE WHEN category_id=$2 THEN 0 ELSE 1 END,id) AS position FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(external_id),'') IS NOT NULL AND (platform<>'WHATSAPP' OR whatsapp_destination_type='GROUP') AND (category_id=$2 OR category_id IS NULL OR category_id='cat-gerais')) ranked WHERE position=1", [accountId, offer.category_id])).rows;
    const sentGroups = [];
    for (const group of groups) {
      const key = `radar:${offer.id}:${group.id}:${day}`;
      const transaction = await db.transaction([
        { sql: 'SELECT id FROM accounts WHERE id=$1 FOR UPDATE', params: [accountId] },
        { sql: `INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url,mode,priority,idempotency_key,image_storage_key)
          SELECT $1,$2,$3,$4,'READY',$5,$6,'SMART',$7,$8,$12
          WHERE EXISTS(SELECT 1 FROM accounts WHERE id=$2 AND status='ACTIVE')
          AND (SELECT count(*) FROM publications WHERE account_id=$2 AND created_at>=(date_trunc('day',now() AT TIME ZONE $9) AT TIME ZONE $9))<$10
          AND NOT EXISTS(SELECT 1 FROM publications WHERE account_id=$2 AND group_id=$4 AND status='PUBLISHED' AND published_at>now()-make_interval(mins => $11::int))
          AND NOT EXISTS(SELECT 1 FROM publications WHERE account_id=$2 AND offer_id=$3 AND group_id=$4)
          ON CONFLICT DO NOTHING RETURNING id`,
          params: [crypto.randomUUID(), accountId, offer.id, group.id, message(offer), offer.image_url, item.radar.score, key, timezone, rule.max_publications_per_day, rule.cooldown_minutes,offer.image_storage_key] }
      ]);
      if (!transaction.results[1].rows.length) continue;
      queued++; sentGroups.push(group.id);
      if (group.platform === 'TELEGRAM') telegramQueued++; else whatsappQueued++;
    }
    results.push({ offer_id: offer.id, status: sentGroups.length ? 'PUBLISHED_TO_QUEUE' : groups.length ? 'LIMIT_OR_COOLDOWN' : 'NO_DESTINATION', groups: sentGroups, score: item.radar.score, reasons: item.radar.reasons });
    if (sentGroups.length) break;
  }
  if (telegramQueued) await scheduler.now('/api/jobs/telegram');
  return { published: queued, queued, evaluated, telegramQueued, whatsappQueued, blockedAffiliate, blockedPrice, results };
}