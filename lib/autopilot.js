import { db, scheduler } from 'hatchable';
// Product category filters are intentionally not applied by the publication queue.
// Lomadee link-read validation is not a publication prerequisite.
import { calculateRadarScore } from './radar.js';
import { message } from './automation.js';
import { httpsUrl, directImageUrl } from './validation.js';

export async function evaluateMatches(accountId, sourceFilter = '', options = {}) {
  const rules = (await db.query("SELECT * FROM autopilot_rules WHERE account_id=$1 AND status='ACTIVE' ORDER BY min_score DESC,updated_at DESC", [accountId])).rows;
  const offers = (await db.query("SELECT * FROM offers WHERE account_id=$1 AND status IN ('APPROVED','PENDING','READY','NEEDS_REVIEW','REJECTED') AND ($2='' OR source=$2) AND ($2<>'ALIEXPRESS' OR validation_status='VALIDATED') ORDER BY COALESCE(radar_score,score,35) DESC,created_at DESC", [accountId, sourceFilter])).rows;
  const matches = [];
  const scoreUpdates = [];
  const blockedMedication = 0;
  for (const offer of offers) {
    const radar = calculateRadarScore({ currentPrice: offer.current_price, originalPrice: offer.original_price, lowestPrice: offer.price_lowest, averagePrice: offer.price_average, historyCount: offer.price_history_count, title: offer.title, coupon: Boolean(offer.coupon_code || offer.coupon_url) });
    const discount = offer.original_price > offer.current_price ? Math.round((offer.original_price - offer.current_price) * 100 / offer.original_price) : 0;
    // The radar score is informational only; publication eligibility uses explicit commercial and safety rules.
    const matchedRules = rules.filter(rule => (!rule.max_price || offer.current_price <= rule.max_price) && (!rule.require_price_history || offer.price_history_count >= 3) && (!rule.category_id || rule.category_id === offer.category_id));
    scoreUpdates.push({ id: offer.id, score: radar.score, reasons: radar.reasons.join(' • ') });
    matches.push({ offer, radar, discount, matchedRules });
  }
  if (scoreUpdates.length && options?.dryRun !== true) {
    await db.query("UPDATE offers o SET radar_score=u.score,radar_reasons=u.reasons,radar_updated_at=now() FROM jsonb_to_recordset($1::jsonb) AS u(id text,score integer,reasons text) WHERE o.id=u.id AND o.account_id=$2", [JSON.stringify(scoreUpdates), accountId]);
  }
  return { rules, matches, evaluated: offers.length, blockedMedication };
}

export async function enqueueMatches(accountId, requestedOfferId = '', options = {}) {
  const dryRun = options?.dryRun === true;
  const { matches, evaluated, blockedMedication = 0 } = await evaluateMatches(accountId, options?.source || '', options);
  // O autopilot publica somente ofertas já aprovadas; não promove automaticamente itens em revisão/rejeitados.
  const approved = matches.filter(x => x.offer.status === 'APPROVED' && (!requestedOfferId || x.offer.id === requestedOfferId));
  const groups = (await db.query(
    "SELECT id,platform,category_id FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(external_id),'') IS NOT NULL AND (platform<>'WHATSAPP' OR whatsapp_destination_type='GROUP') ORDER BY platform,id",
    [accountId]
  )).rows;
  const settings = (await db.query("SELECT timezone FROM account_settings WHERE account_id=$1", [accountId])).rows[0];
  const timezone = settings?.timezone || 'America/Sao_Paulo';
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const verifiedPriceOffers = new Set((await db.query(
    "SELECT DISTINCT ph.offer_id FROM offer_price_history ph JOIN offers o ON o.id=ph.offer_id AND o.account_id=ph.account_id WHERE ph.account_id=$1 AND ph.source_type='OFFICIAL_API' AND ph.verified_at IS NOT NULL AND ph.verified_at>now()-interval '24 hours' AND ph.price=o.current_price AND ph.original_price IS NOT DISTINCT FROM o.original_price AND ph.verified_at=(SELECT MAX(ph2.verified_at) FROM offer_price_history ph2 WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id AND ph2.source_type='OFFICIAL_API')",
    [accountId]
  )).rows.map(row => row.offer_id));
  const queueCandidates = approved.filter(item => verifiedPriceOffers.has(item.offer.id)
    && (item.offer.image_storage_key || directImageUrl(item.offer.image_url))
    && httpsUrl(item.offer.affiliate_url));
  const candidates = [];
  for (const item of queueCandidates) {
    const offer = item.offer;
    const platforms = [...new Set(groups.map(group => group.platform))];
    for (const platform of platforms) {
      // One active destination per platform; prefer the exact category, then the universal general group.
      const group = groups
        .filter(candidate => candidate.platform === platform && (candidate.category_id == null || candidate.category_id === 'cat-gerais' || candidate.category_id === offer.category_id))
        .sort((a,b) => Number(b.category_id === offer.category_id) - Number(a.category_id === offer.category_id) || a.id.localeCompare(b.id))[0];
      if (!group) continue;
      candidates.push({
        offer_id: offer.id,
        group_id: group.id,
        message: message(offer),
        image_url: offer.image_url || null,
        priority: Number(item.radar.score) || 0,
        idempotency_key: `radar:${offer.id}:${group.id}:${day}`,
        image_storage_key: offer.image_storage_key || null,
        platform: group.platform,
        source: offer.source
      });
    }
  }
  const payload = candidates.map(({offer_id,group_id,message,image_url,priority,idempotency_key,image_storage_key}) =>
    ({offer_id,group_id,message,image_url,priority,idempotency_key,image_storage_key}));
  let inserted = [];
  if (dryRun) {
    if (payload.length) {
      const preview = await db.query(`
        SELECT x.offer_id,x.group_id
        FROM jsonb_to_recordset($1::jsonb) AS x(offer_id text,group_id text,message text,image_url text,priority integer,idempotency_key text,image_storage_key text)
        JOIN promo_groups g ON g.id=x.group_id AND g.account_id=$2 AND g.status='ACTIVE'
        WHERE NOT EXISTS(SELECT 1 FROM publications p WHERE p.account_id=$2 AND p.offer_id=x.offer_id AND p.group_id=x.group_id)
          AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=$2 AND a.status='ACTIVE')
      `, [JSON.stringify(payload), accountId]);
      inserted = preview.rows || [];
    }
  } else if (payload.length) {
    const transaction = await db.transaction([
      {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
      {sql:`
        INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url,mode,priority,idempotency_key,image_storage_key)
        SELECT gen_random_uuid()::text,$2,x.offer_id,x.group_id,'READY',x.message,x.image_url,'SMART',x.priority,x.idempotency_key,x.image_storage_key
        FROM jsonb_to_recordset($1::jsonb) AS x(offer_id text,group_id text,message text,image_url text,priority integer,idempotency_key text,image_storage_key text)
        JOIN promo_groups g ON g.id=x.group_id AND g.account_id=$2 AND g.status='ACTIVE'
        WHERE EXISTS(SELECT 1 FROM accounts a WHERE a.id=$2 AND a.status='ACTIVE')
          AND NOT EXISTS(SELECT 1 FROM publications p WHERE p.account_id=$2 AND p.offer_id=x.offer_id AND p.group_id=x.group_id)
        ON CONFLICT DO NOTHING
        RETURNING id,offer_id,group_id
      `,params:[JSON.stringify(payload),accountId]}
    ]);
    inserted = transaction.results[1].rows || [];
  }
  const count = dryRun ? inserted.length : inserted.length;
  const insertedKeys = new Set(inserted.map(x=>x.offer_id+'|'+x.group_id));
  const telegramQueued = candidates.filter(x=>x.platform==='TELEGRAM'&&insertedKeys.has(x.offer_id+'|'+x.group_id)).length;
  const whatsappQueued = candidates.filter(x=>x.platform==='WHATSAPP'&&insertedKeys.has(x.offer_id+'|'+x.group_id)).length;
  const queued = dryRun ? count : inserted.length;
  if (telegramQueued && !dryRun) await scheduler.now('/api/jobs/telegram');
  return {
    dryRun,published:dryRun?0:queued,queued:dryRun?0:queued,wouldQueue:dryRun?queued:0,
    evaluated,telegramQueued:dryRun?0:telegramQueued,wouldTelegramQueue:dryRun?telegramQueued:0,
    whatsappQueued:dryRun?0:whatsappQueued,wouldWhatsappQueue:dryRun?whatsappQueued:0,
    blockedAffiliate:0,blockedPrice:0,blockedMedication,blockedDuplicate:0,
    queueBackpressure:{enabled:false,blockedByCapacity:0},
    results:{approvedOffers:approved.length,candidates:candidates.length,inserted:queued,bySource:Object.fromEntries([...new Set(approved.map(x=>x.offer.source))].map(source=>[source,approved.filter(x=>x.offer.source===source).length]))}
  };
}