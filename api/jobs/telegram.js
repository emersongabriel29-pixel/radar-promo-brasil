import { db } from 'hatchable';
import { configuredBotToken,sendTelegramOffer } from 'lib/telegram.js';

export const access='scheduler';
export const methods=['POST'];

async function failPublication(item,error){
  await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$3,next_attempt_at=now()+interval '15 minutes',telegram_connection_id=NULL WHERE id=$1 AND account_id=$2",[item.id,item.accountId,String(error||'Falha no Telegram').slice(0,500)]);
}

export default async function(req,res){
  const origin='https://radar-promo-brasil.hatchable.site';
  const rows=(await db.query("SELECT p.id,p.account_id AS \"accountId\",p.message,p.image_url AS \"imageUrl\",p.attempts,o.affiliate_url AS \"affiliateUrl\",g.external_id AS \"groupExternalId\",g.name AS \"groupName\" FROM publications p JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.platform='TELEGRAM' AND g.external_id IS NOT NULL AND p.image_url IS NOT NULL ORDER BY p.priority DESC,p.created_at LIMIT 20")).rows;
  let published=0,failed=0;
  for(const item of rows){
    const claimed=(await db.query("UPDATE publications SET status='DISPATCHING',attempts=attempts+1,last_attempt_at=now() WHERE id=$1 AND account_id=$2 AND status IN ('READY','RETRY') RETURNING id",[item.id,item.accountId])).rows[0];
    if(!claimed)continue;
    const connections=(await db.query("SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority,last_seen_at DESC NULLS LAST",[item.accountId])).rows;
    let sent=false,lastError='Nenhum bot ativo conectado.';
    for(const connection of connections){
      try{
        const token=await configuredBotToken(connection.secretSlot);
        const trackingUrl=origin+'/api/r/'+encodeURIComponent(item.id),trackedMessage=String(item.message||'').split(item.affiliateUrl).join(trackingUrl);
        await sendTelegramOffer(token,{...item,message:trackedMessage,affiliateUrl:trackingUrl});
        await db.query("UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,telegram_connection_id=$3 WHERE id=$1 AND account_id=$2",[item.id,item.accountId,connection.id]);
        await db.query("UPDATE telegram_connections SET failure_count=0,last_seen_at=now(),status='ACTIVE',updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,item.accountId]);
        sent=true;published++;break;
      }catch(e){
        lastError=e?.message||'Falha no Telegram';
        await db.query("UPDATE telegram_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END,updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,item.accountId]);
      }
    }
    if(!sent){await failPublication(item,lastError);failed++;}
  }
  return res.json({processed:rows.length,published,failed});
}