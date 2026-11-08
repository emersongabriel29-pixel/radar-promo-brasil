import { db } from 'hatchable';
import { configuredBotToken, sendTelegramOffer } from 'lib/telegram.js';
import { cacheOfferImage } from 'lib/offer-images.js';
import { formatPromo } from 'lib/promo-message.js';
import { eligiblePublication } from 'lib/delivery.js';
import { publicationPrioritySql } from 'lib/publication-priority.js';

export const access = 'scheduler';
export const methods = ['POST'];

const clean = (value, max=500) => String(value ?? '').trim().slice(0,max);
const asArray = value => Array.isArray(value) ? value : [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function claimBatch(accountId, ids) {
  const tokenById = new Map();
  const delays = [700, 1500, 3000, 6000];
  for (let attempt=0;;attempt++) {
    try {
      const result = await db.transaction([
        { sql: 'SELECT id FROM accounts WHERE id=$1 FOR UPDATE', params: [accountId] },
        { sql: `
          UPDATE publications p
          SET status='DISPATCHING',attempts=p.attempts+1,last_attempt_at=now(),dispatch_token=gen_random_uuid()::text
          FROM promo_groups g
          WHERE p.id=ANY($1::text[]) AND p.account_id=$2
            AND p.status IN ('READY','RETRY')
            AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
            AND g.id=p.group_id AND g.account_id=p.account_id
            AND g.status='ACTIVE' AND g.platform='TELEGRAM'
            AND ${eligiblePublication}
            AND NOT EXISTS(SELECT 1 FROM publications busy WHERE busy.account_id=p.account_id AND busy.group_id=p.group_id AND busy.status='DISPATCHING')
          RETURNING p.id,p.dispatch_token AS "dispatchToken"
        `, params: [ids, accountId] }
      ]);
      for (const row of (result.results[1]?.rows || [])) tokenById.set(row.id,row.dispatchToken);
      return tokenById;
    } catch (error) {
      const limited = /rate limit exceeded for db\/transaction/i.test(String(error?.message || ''));
      if (!limited || attempt >= delays.length) { if (error && typeof error === 'object') error.schedulerStage='claimBatch'; throw error; }
      await wait(delays[attempt] + Math.floor(Math.random()*350));
    }
  }
}

async function processAccount(accountId, settings) {
  const result = { accountId, claimedTurn: true, source: null, processed: 0, published: 0, failed: 0, unconfirmed: 0, skipped: 0 };
  const runQuery = async (stage, sql, params) => {
    try { return await db.query(sql, params); }
    catch (error) { if (error && typeof error === 'object') error.schedulerStage = stage; throw error; }
  };
  const config = settings.source_config && typeof settings.source_config === 'object' ? settings.source_config : {};
  const configuredOrder = asArray(settings.source_order).map(x=>clean(x,60).toUpperCase()).filter(Boolean);
  const availableRows = (await runQuery('availableRows', `
    SELECT DISTINCT COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' END) AS source
    FROM publications p
    LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
    JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
    WHERE p.account_id=$1 AND p.status IN ('READY','RETRY')
      AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
      AND g.status='ACTIVE' AND g.platform='TELEGRAM'
      AND NULLIF(trim(g.external_id),'') IS NOT NULL
      AND ${eligiblePublication}
        AND COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' END) IS NOT NULL
  `,[accountId])).rows;
  const available = new Set(availableRows.map(row=>clean(row.source,60).toUpperCase()).filter(Boolean));
  const discovered = [...available].filter(source=>!configuredOrder.includes(source)).sort();
  const order = [...configuredOrder,...discovered];
  if (discovered.length) {
    await runQuery('persistSourceOrder', 'UPDATE publication_scheduler_settings SET source_order=$2::jsonb,updated_at=now() WHERE account_id=$1',[accountId,JSON.stringify(order)]);
  }
  const last = clean(settings.last_source,60).toUpperCase();
  const start = last ? Math.max(0,order.indexOf(last)+1) % Math.max(1,order.length) : 0;
  let selected = null, selectedConfig = null, rows = [];
  for (let offset=0;offset<order.length;offset++) {
    const source = order[(start+offset)%order.length];
    const item = config[source] && typeof config[source] === 'object' ? config[source] : {};
    if (item.enabled === false || !available.has(source)) { result.skipped++; continue; }
    const sourceBatch = Math.max(1,Math.min(100,Math.floor(Number(item.batchSize)||Number(settings.batch_size)||20)));
    const limit = Math.min(Number(settings.batch_size)||20,sourceBatch);
    const candidates = (await runQuery('candidates', `
      SELECT p.id,p.group_id AS "groupId",p.content_type AS "contentType",p.account_id AS "accountId",
        p.message,p.offer_id AS "offerId",COALESCE(p.image_url,o.image_url) AS "imageUrl",
        COALESCE(p.image_storage_key,o.image_storage_key) AS "imageStorageKey",p.attempts,
        o.title AS "offerTitle",o.source,o.current_price AS "currentPrice",o.original_price AS "originalPrice",
        o.affiliate_url AS "affiliateUrl",o.coupon_code AS "couponCode",o.coupon_url AS "couponUrl",
        c.name AS "category",g.external_id AS "groupExternalId",
        d.sales_count AS "shopeeSales",d.rating AS "shopeeRating",d.raw_data AS "promoMetadata",(d.raw_data->>'isOfficialShop'='true') AS "shopeeOfficialShop"
      FROM publications p
      LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
      LEFT JOIN categories c ON c.id=o.category_id AND c.account_id=o.account_id
      LEFT JOIN LATERAL (
        SELECT sales_count,rating,commission_rate,brand_name,raw_data FROM affiliate_discovery_items
        WHERE account_id=o.account_id AND kind='PRODUCT'
          AND offer_id=o.id
        ORDER BY last_seen_at DESC LIMIT 1
      ) d ON true
      JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
      WHERE p.account_id=$1 AND p.status IN ('READY','RETRY')
        AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
        AND g.status='ACTIVE' AND g.platform='TELEGRAM'
        AND NULLIF(trim(g.external_id),'') IS NOT NULL
        AND ${eligiblePublication} AND COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' ELSE '' END)=$2
        AND (upper(COALESCE(o.source,''))<>'ALIEXPRESS' OR NOT EXISTS (
          SELECT 1 FROM publications recent
          JOIN offers recent_offer ON recent_offer.id=recent.offer_id AND recent_offer.account_id=recent.account_id
          JOIN affiliate_discovery_items recent_item ON recent_item.offer_id=recent_offer.id AND recent_item.account_id=recent_offer.account_id AND recent_item.marketplace='ALIEXPRESS' AND recent_item.kind='PRODUCT'
          WHERE recent.account_id=p.account_id AND recent.group_id=p.group_id AND recent.status IN ('PUBLISHED','DISPATCHING')
            AND COALESCE(recent.published_at,recent.last_attempt_at,recent.created_at)>=now()-interval '24 hours'
            AND upper(recent_offer.source)='ALIEXPRESS'
            AND (
              recent_item.external_id=(SELECT current_item.external_id FROM affiliate_discovery_items current_item WHERE current_item.offer_id=o.id AND current_item.account_id=o.account_id AND current_item.marketplace='ALIEXPRESS' AND current_item.kind='PRODUCT' ORDER BY current_item.last_seen_at DESC LIMIT 1)
              OR lower(regexp_replace(COALESCE(recent_offer.title,''),'[^a-zA-Z0-9]+','','g'))=lower(regexp_replace(COALESCE(o.title,''),'[^a-zA-Z0-9]+','','g'))
            )
        ))
      ORDER BY ${publicationPrioritySql('p','o','d')} DESC,p.created_at ASC
      LIMIT $3
    `,[accountId,source,limit])).rows;
    if (candidates.length) { selected=source; selectedConfig=item; rows=candidates; break; }
    result.skipped++;
  }

  if (!selected || !rows.length) {
    await runQuery('markIdle', "UPDATE publication_scheduler_settings SET last_result=$2::jsonb,updated_at=now() WHERE account_id=$1",[accountId,JSON.stringify({status:'IDLE',reason:'NO_ELIGIBLE_PUBLICATIONS',skipped:result.skipped})]);
    return result;
  }

  result.source = selected;
  const connections = (await runQuery('loadConnections', "SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority,last_seen_at DESC NULLS LAST",[accountId])).rows;
  if (!connections.length) {
    await runQuery('markBlocked', "UPDATE publication_scheduler_settings SET last_source=$2,last_result=$3::jsonb,updated_at=now() WHERE account_id=$1",[accountId,selected,JSON.stringify({status:'BLOCKED',reason:'NO_ACTIVE_TELEGRAM_BOT',source:selected})]);
    return result;
  }

  const tokens = new Map();
  for (const connection of connections) {
    try { tokens.set(connection.id,await configuredBotToken(connection.secretSlot,accountId)); }
    catch (error) { console.error('telegram bot token unavailable',connection.id,String(error?.message||'TOKEN_ERROR').slice(0,100)); }
  }
  const ids = rows.map(row=>row.id);
  const claimed = await claimBatch(accountId,ids);
  rows = rows.filter(item=>claimed.has(item.id)).map(item=>({...item,dispatchToken:claimed.get(item.id)}));
  result.processed = rows.length;

  for (const item of rows) {
    let sent=false,lastError='Nenhum bot ativo conectado.';
    for (const connection of connections) {
      const token=tokens.get(connection.id);
      if (!token) continue;
      let providerAccepted=false;
      try {
        const affiliate=String(item.affiliateUrl||'').trim();
        const baseMessage=String(item.message||'').replace(/https?:\/\/[^\\s]+\/api\/r\/[0-9a-f-]+/gi,affiliate);
        const couponUrl=String(item.couponUrl||'').trim();
        let message=item.contentType==='MESSAGE'
          ? (item.couponCode&&couponUrl&&!baseMessage.includes(couponUrl)?baseMessage+String.fromCharCode(10,10)+'🎟️ Resgate o cupom aqui: '+couponUrl:baseMessage)
          : formatPromo({title:item.offerTitle,source:item.source,category:item.category,currentPrice:Number(item.currentPrice)||0,originalPrice:Number(item.originalPrice)||0,affiliateUrl:affiliate,couponCode:item.couponCode,couponUrl,promoMetadata:item.promoMetadata}).message;
        if(item.contentType!=='MESSAGE'&&String(item.source||'').toUpperCase()==='SHOPEE'){
          const signals=[];
          if(item.shopeeSales!==null&&item.shopeeSales!==undefined&&Number.isFinite(Number(item.shopeeSales)))signals.push('🔥 '+Number(item.shopeeSales).toLocaleString('pt-BR')+' vendidos');
          if(item.shopeeRating!==null&&item.shopeeRating!==undefined&&Number.isFinite(Number(item.shopeeRating))&&Number(item.shopeeRating)>0)signals.push('⭐ '+Number(item.shopeeRating).toFixed(1).replace('.',',')+'/5');
          if(item.shopeeOfficialShop===true)signals.unshift('🏬 Loja oficial');
          if(signals.length)message=message.replace(/\n\nℹ️/, '\n\n'+signals.join('  |  ')+'\n\nℹ️');
        }
        const hasImage=Boolean(item.imageStorageKey||item.imageUrl);
        let imageUrl=null;
        if(item.contentType!=='MESSAGE'&&hasImage){
          try{imageUrl=await cacheOfferImage({...item,imageUrl:item.imageUrl},db);}
          catch(mediaError){
            if(!String(mediaError?.code||'').startsWith('MEDIA_'))throw mediaError;
            console.warn('telegram media unavailable; using text fallback',item.id,String(mediaError?.code||'MEDIA_ERROR').slice(0,60));
          }
        }
        const external=await sendTelegramOffer(token,{...item,imageUrl,message,affiliateUrl:affiliate});
        providerAccepted=true;
        await runQuery('markPublished', "UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,telegram_connection_id=$3,external_message_id=$4,dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$5",[item.id,accountId,connection.id,String(external?.message_id||''),item.dispatchToken]);
        await runQuery('markConnectionHealthy', "UPDATE telegram_connections SET failure_count=0,last_seen_at=now(),status='ACTIVE',updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,accountId]);
        result.published++;sent=true;break;
      } catch(error) {
        lastError=String(error?.message||error).slice(0,500);
        if(providerAccepted||error?.code==='DELIVERY_UNCONFIRMED'||/timeout|timed out|ECONNRESET|socket hang up/i.test(lastError)){
          await runQuery('markWaitingConfirmation', "UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Entrega incerta. Confira o destino antes de reenviar.',dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$3",[item.id,accountId,item.dispatchToken]);
          result.unconfirmed++;sent=true;break;
        }
        if(['MEDIA_IMAGE_NOT_FOUND','MEDIA_URL_INVALID','MEDIA_TYPE_UNSUPPORTED','MEDIA_SIZE_INVALID'].includes(error?.code)){
          await runQuery('markMediaFailed', "UPDATE publications SET status='FAILED',error_message=$3,next_attempt_at=NULL,telegram_connection_id=NULL,dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$4",[item.id,accountId,lastError,item.dispatchToken]);
          result.failed++;sent=true;break;
        }
        if(String(error?.code||'').startsWith('MEDIA_')) break;
        await runQuery('markConnectionFailure', "UPDATE telegram_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END,updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,accountId]);
      }
    }
    if(!sent){
      const retryMinutes=Math.min(360,5*Math.pow(2,Math.min(6,Number(item.attempts)||0)))+Math.floor(Math.random()*3);
      await runQuery('markRetryOrFailed', "UPDATE publications SET status=CASE WHEN attempts<5 THEN 'RETRY' ELSE 'FAILED' END,error_message=$3,next_attempt_at=CASE WHEN attempts<5 THEN now()+($4::text||' minutes')::interval ELSE NULL END,telegram_connection_id=NULL,dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$5",[item.id,accountId,lastError,retryMinutes,item.dispatchToken]);
      result.failed++;
    }
    // Telegram group delivery is limited to about 1 message/second; keep a small safety margin without holding the function for 4 seconds per offer.
    if (result.processed>1) await wait(1100);
  }

  const interval = selectedConfig?.intervalMinutes == null ? Number(settings.interval_minutes)||10 : Math.max(1,Math.min(1440,Number(selectedConfig.intervalMinutes)||Number(settings.interval_minutes)||10));
  await runQuery('markTurnComplete', `
    UPDATE publication_scheduler_settings
    SET last_source=$2,
        next_turn_at=CASE WHEN $3::integer=60 THEN date_trunc('hour',COALESCE(last_run_at,now()))+interval '1 hour' ELSE COALESCE(last_run_at,now())+($3::text||' minutes')::interval END,
        last_result=$4::jsonb,updated_at=now()
    WHERE account_id=$1
  `,[accountId,selected,interval,JSON.stringify({status:'PROCESSED',source:selected,processed:result.processed,published:result.published,failed:result.failed,unconfirmed:result.unconfirmed,intervalMinutes:interval})]);
  return result;
}

export default async function handler(req,res) {
  const totals={accounts:0,turns:0,processed:0,published:0,failed:0,unconfirmed:0,skipped:0,results:[]};
  try {
    await db.query(`
      INSERT INTO publication_scheduler_settings(account_id)
      SELECT DISTINCT g.account_id
      FROM promo_groups g JOIN accounts a ON a.id=g.account_id AND a.status='ACTIVE'
      WHERE g.status='ACTIVE' AND g.platform='TELEGRAM' AND NULLIF(trim(g.external_id),'') IS NOT NULL
      ON CONFLICT(account_id) DO NOTHING
    `);
    await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Envio interrompido. Confira o destino antes de reenviar.',dispatch_token=NULL WHERE status='DISPATCHING' AND last_attempt_at<now()-interval '20 minutes' AND group_id IN (SELECT id FROM promo_groups WHERE platform='TELEGRAM')");
    const due=(await db.query("SELECT account_id FROM publication_scheduler_settings WHERE enabled=true AND next_turn_at<=now() ORDER BY next_turn_at LIMIT 25")).rows;
    for(const row of due){
      const claimed=(await db.query(`
        UPDATE publication_scheduler_settings
        SET next_turn_at=now()+(interval_minutes::text||' minutes')::interval,last_run_at=now(),updated_at=now()
        WHERE account_id=$1 AND enabled=true AND next_turn_at<=now()
        RETURNING account_id,interval_minutes,batch_size,source_order,source_config,last_source
      `,[row.account_id])).rows[0];
      if(!claimed)continue;
      totals.turns++;
      try{
        const result=await processAccount(row.account_id,claimed);
        totals.accounts++;totals.processed+=result.processed;totals.published+=result.published;totals.failed+=result.failed;totals.unconfirmed+=result.unconfirmed;totals.skipped+=result.skipped;
        totals.results.push(result);
      }catch(error){
        totals.failed++;
        const errorStage=String(error?.schedulerStage||'processAccount').slice(0,60);
        const errorCode=String(error?.code||error?.name||'ERROR').slice(0,80);
        const errorDetail=String(error?.message||'').replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/(token|secret|api[_-]?key)=?[^&\s]+/gi,'$1=[redacted]').slice(0,160);
        console.error('publication scheduler account failed',row.account_id,errorStage,errorCode,errorDetail);
        await db.query("UPDATE publication_scheduler_settings SET last_result=$2::jsonb,updated_at=now() WHERE account_id=$1",[row.account_id,JSON.stringify({status:'ERROR',stage:errorStage,error:errorCode,detail:errorDetail})]);
      }
    }
    return res.json({ok:totals.failed===0,...totals,centralScheduler:true,cadence:'hourly-cron'});
  }catch(error){
    console.error('publication scheduler failed',String(error?.code||error?.name||'ERROR').slice(0,80),String(error?.message||'').slice(0,180));
    return res.status(500).json({error:'Falha no escalonador central de publicações.'});
  }
}