import { db,config,scheduler } from 'hatchable';
import { configuredBotToken,sendTelegramOffer } from 'lib/telegram.js';
import { eligiblePublication,claimPublication } from 'lib/delivery.js';
import {cacheOfferImage} from 'lib/offer-images.js';
import {formatPromo} from 'lib/promo-message.js';
export const access='scheduler';
export const methods=['POST'];

export default async function(req,res){
  const origin=String(await config.get('public_app_url')||'https://radar-promo-brasil.hatchable.site').replace(/\/$/,'');
  const rotationTarget=(await db.query("SELECT id,account_id FROM promo_groups WHERE status='ACTIVE' AND platform='TELEGRAM' AND NULLIF(trim(external_id),'') IS NOT NULL ORDER BY id LIMIT 1")).rows[0];
  const rotationState=rotationTarget?(await db.query("SELECT last_source,consecutive_count FROM marketplace_rotation_state WHERE account_id=$1 AND group_id=$2",[rotationTarget.account_id,rotationTarget.id])).rows[0]:null;
  const sourceOrder=['ALIEXPRESS','SHOPEE','LOMADEE','AMAZON','MERCADOLIVRE','CASAS_BAHIA','MAGALU','RAKUTEN'];
  const lastIndex=sourceOrder.indexOf(rotationState?.last_source||'');
  const preferredSource=rotationState?.consecutive_count>=10?sourceOrder[(lastIndex+1+sourceOrder.length)%sourceOrder.length]:(rotationState?.last_source||'');
  const rows=(await db.query(`SELECT p.id,p.group_id AS "groupId",p.content_type AS "contentType",p.account_id AS "accountId",p.message,COALESCE(p.image_url,o.image_url) AS "imageUrl",COALESCE(p.image_storage_key,o.image_storage_key) AS "imageStorageKey",p.attempts,o.title AS "offerTitle",o.source,o.current_price AS "currentPrice",o.original_price AS "originalPrice",o.affiliate_url AS "affiliateUrl",o.coupon_code AS "couponCode",o.coupon_url AS "couponUrl",c.name AS "category",g.external_id AS "groupExternalId" FROM publications p LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id LEFT JOIN categories c ON c.id=o.category_id AND c.account_id=o.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.platform='TELEGRAM' AND NULLIF(trim(g.external_id),'') IS NOT NULL AND (p.content_type='MESSAGE' OR p.image_storage_key IS NOT NULL OR o.image_storage_key IS NOT NULL OR o.image_url IS NOT NULL OR lower(split_part(p.image_url, '?', 1)) LIKE ANY (ARRAY['%.jpg','%.jpeg','%.png','%.webp','%.gif','%.avif','%.bmp'])) AND ${eligiblePublication} ORDER BY CASE WHEN o.source=$1 THEN 0 ELSE 1 END,p.priority DESC,p.created_at LIMIT 1`,[preferredSource])).rows;
  let published=0,failed=0,unconfirmed=0,processed=0;
  for(const item of rows){
    if(!(await claimPublication(db,item.id,item.accountId)))continue;
    processed++;
    const connections=(await db.query("SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority,last_seen_at DESC NULLS LAST",[item.accountId])).rows;
    let sent=false,lastError='Nenhum bot ativo conectado.';
    for(const connection of connections){
      let providerAccepted=false;
      try{
        const token=await configuredBotToken(connection.secretSlot,item.accountId);
        const originalAffiliate=String(item.affiliateUrl||'').trim(),couponUrl=String(item.couponUrl||'').trim(),baseMessage=String(item.message||'').replace(/https?:\/\/[^\s]+\/api\/r\/[0-9a-f-]+/gi,originalAffiliate);const trackedMessage=item.contentType==='MESSAGE'?baseMessage:formatPromo({title:item.offerTitle,source:item.source,category:item.category,currentPrice:Number(item.currentPrice)||0,originalPrice:Number(item.originalPrice)||0,affiliateUrl:originalAffiliate,couponCode:item.couponCode,couponUrl}).message;const effectiveAffiliate=originalAffiliate;
        const external=await sendTelegramOffer(token,{...item,imageUrl:item.contentType==='MESSAGE'?null:await cacheOfferImage({...item,imageUrl:item.imageUrl||item.offerImageUrl},db),message:trackedMessage,affiliateUrl:effectiveAffiliate});
        providerAccepted=true;
        await db.transaction([
          {sql:"UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,telegram_connection_id=$3,external_message_id=$4 WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'",params:[item.id,item.accountId,connection.id,String(external?.message_id||'')]},
          {sql:"UPDATE telegram_connections SET failure_count=0,last_seen_at=now(),status='ACTIVE',updated_at=now() WHERE id=$1 AND account_id=$2",params:[connection.id,item.accountId]},
          {sql:"INSERT INTO marketplace_rotation_state(account_id,group_id,last_source,consecutive_count,updated_at) VALUES($1,$2,$3,1,now()) ON CONFLICT(account_id,group_id) DO UPDATE SET consecutive_count=CASE WHEN marketplace_rotation_state.last_source=EXCLUDED.last_source THEN marketplace_rotation_state.consecutive_count+1 ELSE 1 END,last_source=EXCLUDED.last_source,updated_at=now()",params:[item.accountId,item.groupId,item.source||'UNKNOWN']}
        ]);
        sent=true;published++;break;
      }catch(error){
        lastError=String(error.message||'Falha no Telegram').slice(0,500);
        if(providerAccepted||error.code==='DELIVERY_UNCONFIRMED'){
          await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Entrega incerta. Confira o destino antes de reenviar.' WHERE id=$1 AND account_id=$2",[item.id,item.accountId]);
          unconfirmed++;sent=true;break;
        }
        if(['MEDIA_IMAGE_NOT_FOUND','MEDIA_URL_INVALID','MEDIA_TYPE_UNSUPPORTED','MEDIA_SIZE_INVALID'].includes(error?.code)){
          await db.query("UPDATE publications SET status='FAILED',error_message=$3,next_attempt_at=NULL,telegram_connection_id=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'",[item.id,item.accountId,lastError]);
          failed++;sent=true;break;
        }
        if(String(error?.code||'').startsWith('MEDIA_')) break;
        await db.query("UPDATE telegram_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END,updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,item.accountId]);
      }
    }
    if(!sent){await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$3,next_attempt_at=now()+interval '15 minutes',telegram_connection_id=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'",[item.id,item.accountId,lastError]);failed++;}
  }
  // Continue draining in one-minute steps; if retries are cooling down, wake at their earliest retry time.
  let continuationAt = null;
  if(processed>0 || rows.length>0){
    const intervalMinutes=Number((await db.query("SELECT COALESCE(MIN(interval_minutes),1) AS minutes FROM queues WHERE status='ACTIVE'")).rows[0]?.minutes||1);
    continuationAt=new Date(Date.now()+Math.max(1,intervalMinutes)*60_000+5_000);
  }
  else {
    const retryAt = (await db.query(`SELECT MIN(p.next_attempt_at) AS next_at
      FROM publications p LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id
      JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id
      WHERE p.status='RETRY' AND p.next_attempt_at>now()
        AND g.status='ACTIVE' AND g.platform='TELEGRAM'
        AND NULLIF(trim(g.external_id),'') IS NOT NULL
        AND (p.content_type='MESSAGE' OR p.image_storage_key IS NOT NULL OR o.image_storage_key IS NOT NULL OR o.image_url IS NOT NULL
          OR lower(split_part(p.image_url, '?', 1)) LIKE ANY (ARRAY['%.jpg','%.jpeg','%.png','%.webp','%.gif','%.avif','%.bmp']))
        AND ${eligiblePublication}`)).rows[0]?.next_at;
    if(retryAt) continuationAt = new Date(Math.max(Date.now()+60_000,new Date(retryAt).getTime()+1000));
  }
  if(continuationAt){
    try{
      const continuationName='telegram-queue-drain-'+crypto.randomUUID();
      await scheduler.at(continuationAt,'/api/jobs/telegram',{name:continuationName});
    }catch(error){
      console.error('telegram queue continuation could not be armed',String(error?.message||'SCHEDULER_ERROR').slice(0,160));
    }
  }
  return res.json({processed,published,failed,unconfirmed,continuationScheduled:Boolean(continuationAt),nextContinuationAt:continuationAt?.toISOString()||null});
}