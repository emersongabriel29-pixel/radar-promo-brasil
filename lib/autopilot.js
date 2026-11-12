import { medicationProductSql } from './product-safety.js';
import { db, scheduler } from 'hatchable';
import { canEnterOfferFlow } from './offer-flow-policy.js';
// Destination routing is resolved per platform, source and offer category.
// Lomadee link-read validation is not a publication prerequisite.
import { calculateRadarScore } from './radar.js';
import { message } from './automation.js';
import { classifyProduct } from './category-classifier.js';
import { selectCategoryGroupIds } from './category-routing.js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function transactionWithBackoff(statements) {
  const delays = [600, 1200, 2500, 5000, 8000];
  for (let attempt = 0; ; attempt++) {
    try { return await db.transaction(statements); }
    catch (error) {
      const detail = (String(error?.code || '') + ' ' + String(error?.message || '')).toLowerCase();
      const limited = detail.includes('rate_limited') || detail.includes('rate limit exceeded for db/transaction');
      if (!limited || attempt >= delays.length) throw error;
      await pause(delays[attempt] + Math.floor(Math.random() * 500));
    }
  }
}

export async function evaluateMatches(accountId, sourceFilter = '', options = {}) {
  const rules = (await db.query("SELECT * FROM autopilot_rules WHERE account_id=$1 AND status='ACTIVE' ORDER BY min_score DESC,updated_at DESC", [accountId])).rows;
  const batchSize = Math.min(200, Math.max(1, Math.floor(Number(options?.batchSize) || 200)));
  const offerIds=Array.isArray(options?.offerIds)?[...new Set(options.offerIds.map(String))]:null;
  const offers = (await db.query(`SELECT * FROM offers o WHERE o.account_id=$1 AND NOT ${medicationProductSql('o')} AND (COALESCE(o.imported_by,'')<>'CHROME_EXTENSION' OR o.status IN ('APPROVED','READY') OR EXISTS(SELECT 1 FROM extension_autopublish_settings ext WHERE ext.account_id=o.account_id AND ext.enabled=true)) AND o.status IN ('APPROVED','PENDING','READY','NEEDS_REVIEW') AND ($2='' OR source=$2) AND ($2<>'ALIEXPRESS' OR validation_status='VALIDATED') AND ($4::text[] IS NULL OR o.id=ANY($4::text[])) AND NULLIF(trim(o.title),'') IS NOT NULL AND o.current_price>0 AND COALESCE(o.validation_status,'') <> 'REJECTED' AND NULLIF(trim(o.affiliate_url),'') LIKE 'https://%' AND NOT EXISTS(SELECT 1 FROM publications p WHERE p.account_id=o.account_id AND p.offer_id=o.id) ORDER BY o.created_at ASC LIMIT $3`, [accountId, sourceFilter, batchSize, offerIds])).rows;
  const matches = [];
  const scoreUpdates = [];
  const blockedMedication = 0;
  for (const offer of offers) {
    const radar = calculateRadarScore({ currentPrice: offer.current_price, originalPrice: offer.original_price, lowestPrice: offer.price_lowest, averagePrice: offer.price_average, historyCount: offer.price_history_count, title: offer.title, coupon: Boolean(offer.coupon_code || offer.coupon_url) });
    const discount = offer.original_price > offer.current_price ? Math.round((offer.original_price - offer.current_price) * 100 / offer.original_price) : 0;
    // The radar score is informational only; publication eligibility uses explicit commercial and safety rules.
    const matchedRules = rules; // Rules remain visible as routing/preferences; no commercial threshold blocks an offer.
    scoreUpdates.push({ id: offer.id, score: radar.score, reasons: radar.reasons.join(' • ') });
    matches.push({ offer, radar, discount, matchedRules });
  }
  if (scoreUpdates.length && options?.dryRun !== true) {
    await db.query("UPDATE offers o SET radar_score=u.score,radar_reasons=u.reasons,radar_updated_at=now() FROM jsonb_to_recordset($1::jsonb) AS u(id text,score integer,reasons text) WHERE o.id=u.id AND o.account_id=$2", [JSON.stringify(scoreUpdates), accountId]);
  }
  return { rules, matches, evaluated: offers.length, blockedMedication, batchSize };
}

export async function enqueueMatches(accountId, requestedOfferId = '', options = {}) {
  const dryRun = options?.dryRun === true;
  if (requestedOfferId) options = { ...options, offerIds: [requestedOfferId] };
  const { matches, evaluated, blockedMedication = 0, batchSize = 100 } = await evaluateMatches(accountId, options?.source || '', options);
  // Regra Master: categoria, +18, score, desconto, comissão, avaliação e classificação REVIEW não bloqueiam o fluxo.
  // REJECTED permanece fora até a reconciliação de integridade/duplicidade preservar o registro canônico.
  const approved = matches.filter(x => x.offer.status !== 'REJECTED'
    && canEnterOfferFlow(x.offer).eligible
    && (!requestedOfferId || x.offer.id === requestedOfferId));
  const groups = (await db.query(
    "SELECT id,name,platform,category_id FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(external_id),'') IS NOT NULL AND (platform<>'WHATSAPP' OR whatsapp_destination_type='GROUP') ORDER BY platform,id",
    [accountId]
  )).rows;
  const categories = (await db.query('SELECT id,name,keywords FROM categories WHERE account_id=$1',[accountId])).rows;
  const settings = (await db.query("SELECT timezone FROM account_settings WHERE account_id=$1", [accountId])).rows[0];
  const timezone = settings?.timezone || 'America/Sao_Paulo';
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  const previouslyQueuedOffers = new Set((await db.query(
    "SELECT DISTINCT offer_id FROM publications WHERE account_id=$1",
    [accountId]
  )).rows.map(row => row.offer_id));
  // Do not backfill newly added destinations with offers that already entered publication.
  const queueCandidates = approved.filter(item => !previouslyQueuedOffers.has(item.offer.id)
    && canEnterOfferFlow(item.offer).eligible);
  const candidates = [];
  for (const item of queueCandidates) {
    const offer = item.offer;
    const telegramGroups = groups.filter(group => group.platform === 'TELEGRAM');
    const tags = Array.isArray(offer.classification_tags)
      ? offer.classification_tags.map(tag => String(tag).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''))
      : [];
    const title = Array.from(String(offer.title || '').toLowerCase().normalize('NFD')).filter(character => { const code = character.codePointAt(0); return code < 768 || code > 879; }).join('');
    // Route to Auto/Moto only when the product itself is an automotive part/accessory.
    // Incidental compatibility/use mentions (e.g. "adesivo para motocicleta" or
    // "action camera ... motocicletas") must not send unrelated products to this group.
    const automotiveProductIntent = [
      'pneu para carro','pneu de carro','pneu automotivo','pneus automotivos','pneu de moto','pneu para moto',
      'bateria automotiva','compressor de ar portatil para pneu','compressor portatil para pneu',
      'calibrador de pneu','macaco hidraulico','chave de roda','kit reparo de pneu','tapete automotivo',
      'capa banco carro','capa de banco carro','camera veicular','camera de re','sensor de estacionamento',
      'multimidia automotiva','radio automotivo','som automotivo','alto falante automotivo','carregador veicular',
      'suporte celular para carro','farol automotivo','lanterna automotiva','retrovisor automotivo',
      'pastilha de freio','disco de freio','filtro de oleo','filtro de ar automotivo','vela de ignicao',
      'amortecedor automotivo','correia dentada','escapamento de moto','pecas automotivas','pecas para moto',
      'acessorios automotivos','acessorios para moto','capacete para moto','bau para moto','manopla de moto',
      'protetor de carenagem'
    ].some(term => title.includes(term));
    const isAutomotive = offer.category_id === '91ec3fe3-138e-4506-9702-6c2f8950f0d1'
      || tags.some(tag => /^(automotivo|auto-moto-pecas|acessorios-automotivos|pecas-automotivas)$/.test(tag))
      || automotiveProductIntent;
    const isBaby = offer.category_id === 'cat-bebes'
      || tags.some(tag => /bebes|kids|infantil|criancas/.test(tag));
    // Marketplace is never evidence of shipping origin: both AliExpress and Shopee
    // can contain domestic-stock products. Route only when the offer has an explicit
    // imported classification supplied by verified logistics metadata or human review.
    const isImported = offer.category_id === 'cat-importados'
      || tags.some(tag => /^(importado|produto-importado|envio-internacional-verificado)$/.test(tag));
    const selectedTelegram = new Set();
    const generalGroup = telegramGroups.find(group =>
      group.category_id === 'cat-gerais' || /ofertas/i.test(group.name || ''));

    // Main Telegram destination is universal. Every other active Telegram group
    // is an additional destination when its category matches the offer category.
    if (generalGroup) selectedTelegram.add(generalGroup.id);
    const inferred = classifyProduct({ title: offer.title, sourceCategory: offer.source_category || '' });
    const inferredCategory = categories.find(category => String(category.name || '').toLowerCase() === String(inferred.category || '').toLowerCase());
    // Reclassify confidently matched non-manual offers regardless of marketplace/store.
    // Explicit human category choices remain authoritative.
    if (inferredCategory && Number(inferred.confidence) >= 0.80 && offer.classification_status !== 'MANUAL' && offer.classification_status !== 'REVIEW') {
      offer.category_id = inferredCategory.id;
      offer.subcategory = inferred.subcategory;
      offer.classification_tags = inferred.tags;
      if (!dryRun) await db.query("UPDATE offers SET category_id=$1,subcategory=$2,classification_tags=$3::jsonb,classification_confidence=$4,classification_status=$5,classification_reason=$6 WHERE id=$7 AND account_id=$8 AND COALESCE(classification_status, '') <> 'MANUAL'", [inferredCategory.id,inferred.subcategory,JSON.stringify(inferred.tags),inferred.confidence,'AUTO',inferred.reason,offer.id,accountId]);
    }
    // A category group is a strict destination, not a keyword-based extra destination.
    // This prevents unrelated products (e.g. technology or pet supplies mentioning
    // a home keyword) from being queued to Casa & Lar or another niche group.
    for (const groupId of selectCategoryGroupIds(offer.category_id, telegramGroups)) selectedTelegram.add(groupId);

    // Preserve the established special routing for imported offers and legacy
    // groups whose category metadata may not yet match the offer taxonomy.
    if (isImported) {
      const importedGroup = telegramGroups.find(group =>
        group.category_id === 'cat-importados' || /importados/i.test(group.name || ''));
      if (importedGroup) selectedTelegram.add(importedGroup.id);
    }
    if (isAutomotive) {
      const automotiveGroup = telegramGroups.find(group =>
        group.category_id === '91ec3fe3-138e-4506-9702-6c2f8950f0d1'
        || /auto,? moto|auto.*moto|moto.*pecas/i.test(group.name || ''));
      if (automotiveGroup) selectedTelegram.add(automotiveGroup.id);
    }
    if (isBaby) {
      const babyGroup = telegramGroups.find(group =>
        group.category_id === 'cat-bebes' || /baby|beb[eê]s.*kids/i.test(group.name || ''));
      if (babyGroup) selectedTelegram.add(babyGroup.id);
    }

    for (const groupId of selectedTelegram) {
      const group = telegramGroups.find(candidate => candidate.id === groupId);
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

    // Preserve the existing single-destination behavior for WhatsApp.
    const whatsappGroup = groups
      .filter(candidate => candidate.platform === 'WHATSAPP' && (candidate.category_id == null || candidate.category_id === 'cat-gerais' || candidate.category_id === offer.category_id))
      .sort((a,b) => Number(b.category_id === offer.category_id) - Number(a.category_id === offer.category_id) || a.id.localeCompare(b.id))[0];
    if (whatsappGroup) {
      candidates.push({
        offer_id: offer.id,
        group_id: whatsappGroup.id,
        message: message(offer),
        image_url: offer.image_url || null,
        priority: Number(item.radar.score) || 0,
        idempotency_key: `radar:${offer.id}:${whatsappGroup.id}:${day}`,
        image_storage_key: offer.image_storage_key || null,
        platform: whatsappGroup.platform,
        source: offer.source
      });
    }
  }
  const payload = candidates.map(({offer_id,group_id,message,image_url,priority,idempotency_key,image_storage_key}) =>
    ({offer_id,group_id,message,image_url,priority,idempotency_key,image_storage_key,eligibility_policy_version:'master_v1'}));
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
    const transaction = await transactionWithBackoff([
      {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
      {sql:`
        INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url,mode,priority,idempotency_key,image_storage_key,eligibility_policy_version)
        SELECT gen_random_uuid()::text,$2,x.offer_id,x.group_id,'READY',x.message,x.image_url,'SMART',x.priority,x.idempotency_key,x.image_storage_key,x.eligibility_policy_version
        FROM jsonb_to_recordset($1::jsonb) AS x(offer_id text,group_id text,message text,image_url text,priority integer,idempotency_key text,image_storage_key text,eligibility_policy_version text)
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
  if (!dryRun && inserted.length) {
    const queuedOfferIds = [...new Set(inserted.map(row => row.offer_id).filter(Boolean))];
    await db.query("UPDATE offers SET status='READY',updated_at=now() WHERE account_id=$1 AND id=ANY($2::text[]) AND status IN ('PENDING','NEEDS_REVIEW','APPROVED')", [accountId, queuedOfferIds]);
  }
  // One named wake-up per account/batch (never one-shot per product); the hourly cron remains the safety net.
  if (telegramQueued && !dryRun) {
    await db.query('INSERT INTO publication_scheduler_settings(account_id) VALUES($1) ON CONFLICT(account_id) DO NOTHING',[accountId]);
    const next=(await db.query("SELECT MIN(next_turn_at) AS next_at FROM publication_scheduler_settings WHERE enabled=true")).rows[0]?.next_at;
    if(next) {
      try { await scheduler.at(new Date(Math.max(Date.now()+1000,new Date(next).getTime())),'/api/jobs/telegram',{name:'publication-scheduler-master'}); }
      catch(error) { console.error('publication scheduler arm failed',String(error?.code||error?.name||'ERROR').slice(0,60)); }
    }
  }
  return {
    dryRun,published:0,queued:dryRun?0:queued,wouldQueue:dryRun?queued:0,
    evaluated,telegramQueued:dryRun?0:telegramQueued,wouldTelegramQueue:dryRun?telegramQueued:0,
    whatsappQueued:dryRun?0:whatsappQueued,wouldWhatsappQueue:dryRun?whatsappQueued:0,
    blockedAffiliate:0,blockedPrice:0,blockedMedication,blockedDuplicate:0,
    queueBackpressure:{enabled:true,batchSize,maxBatchSize:200,blockedByCapacity:0},
    results:{eligibleOffers:approved.length,approvedOffers:approved.filter(item=>item.offer.status==='APPROVED').length,candidates:candidates.length,inserted:queued,bySource:Object.fromEntries([...new Set(approved.map(x=>x.offer.source))].map(source=>[source,approved.filter(x=>x.offer.source===source).length]))}
  };
}