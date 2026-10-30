import { db, scheduler } from 'hatchable';
import { configuredBotToken, sendTelegramOffer } from 'lib/telegram.js';
import { cacheOfferImage } from 'lib/offer-images.js';
import { formatPromo } from 'lib/promo-message.js';
import { eligiblePublication } from 'lib/delivery.js';

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
      if (!limited || attempt >= delays.length) throw error;
      await wait(delays[attempt] + Math.floor(Math.random()*350));
    }
  }
}

async function processAccount(accountId, settings) {
  const result = { accountId, claimedTurn: true, source: null, processed: 0, published: 0, failed: 0, unconfirmed: 0, skipped: 0 };
  const config = settings.source_config && typeof settings.source_config === 'object' ? settings.source_config : {};
  const configuredOrder = asArray(settings.source_order).map(x=>clean(x,60).toUpperCase()).filter(Boolean);
  const availableRows = (await db.query(`
    SELECT DISTINCT COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' END) AS source
    FROM publications p
    LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
    JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
    WHERE p.account_id=$1 AND p.status IN ('READY','RETRY')
      AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
      AND g.status='ACTIVE' AND g.platform='TELEGRAM'
      AND NULLIF(trim(g.external_id),'') IS NOT NULL
      AND (p.content_type='MESSAGE' OR p.image_storage_key IS NOT NULL OR o.image_storage_key IS NOT NULL OR o.image_url IS NOT NULL
        OR lower(split_part(p.image_url,'?',1)) LIKE ANY (ARRAY['%.jpg','%.jpeg','%.png','%.webp','%.gif','%.avif','%.bmp'])
        OR lower(p.image_url) LIKE 'https://cf.shopee.com.br/file/%')
      AND ${eligiblePublication}
        AND COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' END) IS NOT NULL
  `,[accountId])).rows;
  const available = new Set(availableRows.map(row=>clean(row.source,60).toUpperCase()).filter(Boolean));
  const discovered = [...available].filter(source=>!configuredOrder.includes(source)).sort();
  const order = [...configuredOrder,...discovered];
  if (discovered.length) {
    await db.query('UPDATE publication_scheduler_settings SET source_order=$2::jsonb,updated_at=now() WHERE account_id=$1',[accountId,JSON.stringify(order)]);
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
    const candidates = (await db.query(`
      SELECT p.id,p.group_id AS "groupId",p.content_type AS "contentType",p.account_id AS "accountId",
        p.message,p.offer_id AS "offerId",COALESCE(p.image_url,o.image_url) AS "imageUrl",
        COALESCE(p.image_storage_key,o.image_storage_key) AS "imageStorageKey",p.attempts,
        o.title AS "offerTitle",o.source,o.current_price AS "currentPrice",o.original_price AS "originalPrice",
        o.affiliate_url AS "affiliateUrl",o.coupon_code AS "couponCode",o.coupon_url AS "couponUrl",
        c.name AS "category",g.external_id AS "groupExternalId"
      FROM publications p
      LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
      LEFT JOIN categories c ON c.id=o.category_id AND c.account_id=o.account_id
      JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
      WHERE p.account_id=$1 AND p.status IN ('READY','RETRY')
        AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now())
        AND g.status='ACTIVE' AND g.platform='TELEGRAM'
        AND NULLIF(trim(g.external_id),'') IS NOT NULL
        AND (p.content_type='MESSAGE' OR p.image_storage_key IS NOT NULL OR o.image_storage_key IS NOT NULL OR o.image_url IS NOT NULL
          OR lower(split_part(p.image_url,'?',1)) LIKE ANY (ARRAY['%.jpg','%.jpeg','%.png','%.webp','%.gif','%.avif','%.bmp'])
          OR lower(p.image_url) LIKE 'https://cf.shopee.com.br/file/%')
        AND ${eligiblePublication} AND COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' ELSE '' END)=$2
      ORDER BY p.priority DESC,p.created_at ASC
      LIMIT $3
    `,[accountId,source,limit])).rows;
    if (candidates.length) { selected=source; selectedConfig=item; rows=candidates; break; }
    result.skipped++;
  }

  if (!selected || !rows.length) {
    await db.query("UPDATE publication_scheduler_settings SET last_result=$2::jsonb,updated_at=now() WHERE account_id=$1",[accountId,JSON.stringify({status:'IDLE',reason:'NO_ELIGIBLE_PUBLICATIONS',skipped:result.skipped})]);
    return result;
  }

  result.source = selected;
  const connections = (await db.query("SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority,last_seen_at DESC NULLS LAST",[accountId])).rows;
  if (!connections.length) {
    await db.query("UPDATE publication_scheduler_settings SET last_source=$2,last_result=$3::jsonb,updated_at=now() WHERE account_id=$1",[accountId,selected,JSON.stringify({status:'BLOCKED',reason:'NO_ACTIVE_TELEGRAM_BOT',source:selected})]);
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
        const message=item.contentType==='MESSAGE'
          ? (item.couponCode&&couponUrl&&!baseMessage.includes(couponUrl)?baseMessage+String.fromCharCode(10,10)+'🎟️ Resgate o cupom aqui: '+couponUrl:baseMessage)
          : formatPromo({title:item.offerTitle,source:item.source,category:item.category,currentPrice:Number(item.currentPrice)||0,originalPrice:Number(item.originalPrice)||0,affiliateUrl:affiliate,couponCode:item.couponCode,couponUrl}).message;
        const imageUrl=item.contentType==='MESSAGE'?null:await cacheOfferImage({...item,imageUrl:item.imageUrl},db);
        const external=await sendTelegramOffer(token,{...item,imageUrl,message,affiliateUrl:affiliate});
        providerAccepted=true;
        await db.query("UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,telegram_connection_id=$3,external_message_id=$4,dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$5",[item.id,accountId,connection.id,String(external?.message_id||''),item.dispatchToken]);
        await db.query("UPDATE telegram_connections SET failure_count=0,last_seen_at=now(),status='ACTIVE',updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,accountId]);
        result.published++;sent=true;break;
      } catch(error) {
        lastError=String(error?.message||error).slice(0,500);
        if(providerAccepted||error?.code==='DELIVERY_UNCONFIRMED'||/timeout|timed out|ECONNRESET|socket hang up/i.test(lastError)){
          await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Entrega incerta. Confira o destino antes de reenviar.',dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$3",[item.id,accountId,item.dispatchToken]);
          result.unconfirmed++;sent=true;break;
        }
        if(['MEDIA_IMAGE_NOT_FOUND','MEDIA_URL_INVALID','MEDIA_TYPE_UNSUPPORTED','MEDIA_SIZE_INVALID'].includes(error?.code)){
          await db.query("UPDATE publications SET status='FAILED',error_message=$3,next_attempt_at=NULL,telegram_connection_id=NULL,dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$4",[item.id,accountId,lastError,item.dispatchToken]);
          result.failed++;sent=true;break;
        }
        if(String(error?.code||'').startsWith('MEDIA_')) break;
        await db.query("UPDATE telegram_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END,updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,accountId]);
      }
    }
    if(!sent){
      const retryMinutes=Math.min(360,5*Math.pow(2,Math.min(6,Number(item.attempts)||0)))+Math.floor(Math.random()*3);
      await db.query("UPDATE publications SET status=CASE WHEN attempts<5 THEN 'RETRY' ELSE 'FAILED' END,error_message=$3,next_attempt_at=CASE WHEN attempts<5 THEN now()+($4::text||' minutes')::interval ELSE NULL END,telegram_connection_id=NULL,dispatch_token=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING' AND dispatch_token=$5",[item.id,accountId,lastError,retryMinutes,item.dispatchToken]);
      result.failed++;
    }
    if (result.processed>1) await wait(4000);
  }

  const interval = selectedConfig?.intervalMinutes == null ? Number(settings.interval_minutes)||10 : Math.max(1,Math.min(1440,Number(selectedConfig.intervalMinutes)||Number(settings.interval_minutes)||10));
  await db.query(`
    UPDATE publication_scheduler_settings
    SET last_source=$2,last_run_at=now(),next_turn_at=now()+($3::text||' minutes')::interval,
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
        console.error('publication scheduler account failed',row.account_id,String(error?.code||error?.name||'ERROR').slice(0,80));
        await db.query("UPDATE publication_scheduler_settings SET last_result=$2::jsonb,updated_at=now() WHERE account_id=$1",[row.account_id,JSON.stringify({status:'ERROR',error:String(error?.code||error?.name||'ERROR').slice(0,80)})]);
      }
    }
    const pending=(await db.query(`
      SELECT s.account_id,s.next_turn_at,s.source_config,COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' END) AS source,
        MIN(p.next_attempt_at) FILTER (WHERE p.status='RETRY' AND p.next_attempt_at>now()) AS retry_at,
        BOOL_OR(p.status='READY' OR p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AS has_due
      FROM publication_scheduler_settings s
      JOIN publications p ON p.account_id=s.account_id AND p.status IN ('READY','RETRY')
      LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
      JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
      WHERE s.enabled=true AND g.status='ACTIVE' AND g.platform='TELEGRAM'
        AND NULLIF(trim(g.external_id),'') IS NOT NULL
        AND ${eligiblePublication}
      GROUP BY s.account_id,s.next_turn_at,s.source_config,COALESCE(upper(o.source),CASE WHEN p.content_type='MESSAGE' THEN 'MANUAL' END)
    `)).rows;
    const nextCandidates=pending.filter(row=>{
      const cfg=row.source_config&&typeof row.source_config==='object'?row.source_config:{};
      return cfg[row.source]?.enabled!==false;
    }).map(row=>{
      const dueAt=new Date(row.next_turn_at).getTime();
      const retryAt=row.retry_at?new Date(row.retry_at).getTime():dueAt;
      return row.has_due?dueAt:Math.max(dueAt,retryAt);
    }).filter(Number.isFinite);
    const next=nextCandidates.length?new Date(Math.min(...nextCandidates)):null;
    let schedulerArmed=false,schedulerArmError=null;
    if(next){
      const when=new Date(Math.max(Date.now()+60000,next.getTime()));
      try { await scheduler.at(when,'/api/jobs/telegram',{name:'publication-scheduler-master'}); schedulerArmed=true; }
      catch(error) { schedulerArmError=String(error?.message||error?.code||error?.name||'SCHEDULER_ERROR').slice(0,160); console.error('publication scheduler rearm failed',schedulerArmError); }
    }
    return res.json({ok:totals.failed===0,...totals,nextTurnAt:next?.toISOString()||null,centralScheduler:true,waitingForBacklog:Boolean(next),schedulerArmed,schedulerArmError});
  }catch(error){
    console.error('publication scheduler failed',String(error?.code||error?.name||'ERROR').slice(0,80),String(error?.message||'').slice(0,180));
    try{
      const next=(await db.query("SELECT MIN(next_turn_at) AS next_at FROM publication_scheduler_settings WHERE enabled=true")).rows[0]?.next_at;
      if(next)await scheduler.at(new Date(Math.max(Date.now()+60000,new Date(next).getTime())),'/api/jobs/telegram',{name:'publication-scheduler-master'});
    }catch{}
    return res.status(500).json({error:'Falha no escalonador central de publicações.'});
  }
}