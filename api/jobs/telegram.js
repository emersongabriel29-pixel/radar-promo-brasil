import { db,config } from 'hatchable';
import { configuredBotToken,sendTelegramOffer } from 'lib/telegram.js';
import { eligiblePublication,claimPublication } from 'lib/delivery.js';
import {offerImage} from 'lib/offer-images.js';
export const access='scheduler';
export const methods=['POST'];

export default async function(req,res){
  const origin=String(await config.get('public_app_url')||'https://radar-promo-brasil.hatchable.site').replace(/\/$/,'');
  const rows=(await db.query(`SELECT p.id,p.content_type AS "contentType",p.account_id AS "accountId",p.message,p.image_url AS "imageUrl",COALESCE(p.image_storage_key,o.image_storage_key) AS "imageStorageKey",p.attempts,o.affiliate_url AS "affiliateUrl",g.external_id AS "groupExternalId" FROM publications p LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.platform='TELEGRAM' AND NULLIF(trim(g.external_id),'') IS NOT NULL AND (p.content_type='MESSAGE' OR p.image_url IS NOT NULL) AND ${eligiblePublication} ORDER BY p.priority DESC,p.created_at LIMIT 20`)).rows;
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
        const trackingUrl=origin+'/api/r/'+encodeURIComponent(item.id),trackedMessage=item.affiliateUrl?String(item.message||'').split(item.affiliateUrl).join(trackingUrl):String(item.message||'');
        const external=await sendTelegramOffer(token,{...item,imageUrl:item.contentType==='MESSAGE'?null:new URL(await offerImage(item),origin).toString(),message:trackedMessage,affiliateUrl:trackingUrl});
        providerAccepted=true;
        await db.transaction([
          {sql:"UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,telegram_connection_id=$3,external_message_id=$4 WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'",params:[item.id,item.accountId,connection.id,String(external?.message_id||'')]},
          {sql:"UPDATE telegram_connections SET failure_count=0,last_seen_at=now(),status='ACTIVE',updated_at=now() WHERE id=$1 AND account_id=$2",params:[connection.id,item.accountId]}
        ]);
        sent=true;published++;break;
      }catch(error){
        lastError=String(error.message||'Falha no Telegram').slice(0,500);
        if(providerAccepted||error.code==='DELIVERY_UNCONFIRMED'){
          await db.query("UPDATE publications SET status='WAITING_CONFIRMATION',error_message='Entrega incerta. Confira o destino antes de reenviar.' WHERE id=$1 AND account_id=$2",[item.id,item.accountId]);
          unconfirmed++;sent=true;break;
        }
        await db.query("UPDATE telegram_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END,updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,item.accountId]);
      }
    }
    if(!sent){await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$3,next_attempt_at=now()+interval '15 minutes',telegram_connection_id=NULL WHERE id=$1 AND account_id=$2 AND status='DISPATCHING'",[item.id,item.accountId,lastError]);failed++;}
  }
  return res.json({processed,published,failed,unconfirmed});
}
