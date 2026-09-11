import { db,config,webhooks,scheduler } from 'hatchable';
import { validateOffer,categoryHint,offerScore,message,fingerprint,discount } from 'lib/automation.js';

export const access='public';
export const methods=['POST'];

async function accountSecret(master,accountId){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(master),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(accountId));
  return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

async function verify(req,accountId){
  let master;
  try{master=await config.get('N8N_WEBHOOK_SECRET')}catch{return null}
  if(!master)return false;
  const secret=await accountSecret(master,accountId);
  const ts=String(req.headers['x-rpb-timestamp']||'');
  const sig=String(req.headers['x-rpb-signature']||'').replace(/^sha256=/,'');
  if(!ts||!sig)return false;
  return webhooks.verifyHmac({raw:ts+'.'+req.rawBody,signature:sig,secret,algorithm:'sha256',encoding:'hex',timestamp:ts,tolerance:300});
}

async function remember(eventKey,action,accountId){
  const scopedKey=accountId+':'+eventKey;
  const r=await db.query('INSERT INTO webhook_events(provider,event_key,action,account_id) VALUES($1,$2,$3,$4) ON CONFLICT(provider,event_key) DO NOTHING RETURNING id',['n8n',scopedKey,action,accountId]);
  return r.rows[0]?.id||null;
}

async function ingest(body,eventId,accountId){
  const items=Array.isArray(body.offers)?body.offers.slice(0,50):[];
  const cats=(await db.query('SELECT id,name FROM categories WHERE account_id=$1',[accountId])).rows;
  const settings=(await db.query('SELECT * FROM account_settings WHERE account_id=$1',[accountId])).rows[0]||{};
  let inserted=0,duplicates=0,rejected=[],telegramQueued=false;
  for(const raw of items){
    const checked=validateOffer(raw);
    if(!checked.ok){rejected.push({title:String(raw?.title||'').slice(0,80),errors:checked.errors});continue}
    const v=checked.value,fp=await fingerprint(v),hint=categoryHint(v.title,v.source),category=cats.find(c=>c.name.toLowerCase()===hint.toLowerCase())||cats.find(c=>c.name.toLowerCase().includes('gerais'));
    const score=offerScore(v),id=crypto.randomUUID();
    const r=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,discount_percent,score,status,message,fingerprint,validation_status,imported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'APPROVED','N8N') ON CONFLICT DO NOTHING RETURNING id",[id,accountId,v.title,v.source,v.originalPrice,v.currentPrice,category?.id||null,v.affiliateUrl,v.imageUrl,v.productUrl,v.couponUrl||null,discount(v.currentPrice,v.originalPrice),score,settings.auto_approve&&score>=settings.minimum_score?'APPROVED':'PENDING',message(v),fp]);
    if(!r.rows.length){duplicates++;continue}inserted++;
    if(settings.auto_approve&&score>=settings.minimum_score&&category){
      const groups=await db.query("SELECT id,platform FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND (category_id=$2 OR category_id IS NULL)",[accountId,category.id]);
      for(const g of groups.rows){await db.query("INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url,mode,idempotency_key) VALUES($1,$2,$3,$4,'READY',$5,$6,'SMART',$7) ON CONFLICT DO NOTHING",[crypto.randomUUID(),accountId,id,g.id,message(v),v.imageUrl,fp+':'+g.id]);if(g.platform==='TELEGRAM')telegramQueued=true;}
    }
  }
  await db.query('UPDATE webhook_events SET status=$1,item_count=$2,processed_at=now() WHERE id=$3',['PROCESSED',inserted,eventId]);
  await db.query("INSERT INTO activity_log(account_id,event_type,title,details,status) VALUES($1,'INGEST','Importação do n8n',$2,'SUCCESS')",[accountId,inserted+' nova(s), '+duplicates+' duplicada(s), '+rejected.length+' rejeitada(s).']);
  if(telegramQueued)await scheduler.now('/api/jobs/telegram');
  return {inserted,duplicates,rejected};
}

async function pull(body,eventId,accountId){
  const max=Math.max(1,Math.min(20,Number(body.limit)||10));
  const r=await db.query("SELECT p.id,p.message,p.image_url AS \"imageUrl\",p.attempts,p.mention_all AS \"mentionAll\",o.title,o.affiliate_url AS \"affiliateUrl\",o.current_price AS \"currentPrice\",g.name AS \"groupName\",g.external_id AS \"groupExternalId\",c.id AS \"connectionId\",c.provider AS \"connectionProvider\",c.external_id AS \"connectionExternalId\" FROM publications p JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id LEFT JOIN LATERAL (SELECT w.* FROM whatsapp_connections w WHERE w.account_id=p.account_id AND w.status='ACTIVE' ORDER BY w.failure_count,w.priority,w.last_seen_at DESC NULLS LAST LIMIT 1) c ON true WHERE p.account_id=$1 AND p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.platform='WHATSAPP' AND g.external_id IS NOT NULL AND p.image_url IS NOT NULL ORDER BY p.priority DESC,p.created_at DESC LIMIT $2",[accountId,max]);
  for(const item of r.rows)await db.query("UPDATE publications SET status='DISPATCHING',attempts=attempts+1,last_attempt_at=now(),connection_id=$2 WHERE id=$1 AND status IN ('READY','RETRY')",[item.id,item.connectionId||null]);
  await db.query('UPDATE webhook_events SET status=$1,item_count=$2,processed_at=now() WHERE id=$3',['PROCESSED',r.rows.length,eventId]);
  return {items:r.rows};
}

async function result(body,eventId,accountId){
  const id=String(body.publicationId||''),ok=body.status==='PUBLISHED';
  if(!id)throw new Error('publicationId obrigatório');
  if(ok){
    await db.query("UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL WHERE id=$1 AND account_id=$2",[id,accountId]);
    await db.query("UPDATE whatsapp_connections SET failure_count=0,last_seen_at=now() WHERE account_id=$2 AND id=(SELECT connection_id FROM publications WHERE id=$1 AND account_id=$2)",[id,accountId]);
  }else{
    await db.query("UPDATE whatsapp_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END WHERE account_id=$2 AND id=(SELECT connection_id FROM publications WHERE id=$1 AND account_id=$2)",[id,accountId]);
    await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$3,next_attempt_at=now()+interval '15 minutes',connection_id=NULL WHERE id=$1 AND account_id=$2",[id,accountId,String(body.error||'Falha informada pelo n8n').slice(0,500)]);
  }
  await db.query('UPDATE webhook_events SET status=$1,item_count=1,processed_at=now() WHERE id=$2',['PROCESSED',eventId]);
  return {updated:true};
}

async function lead(body,eventId,accountId){
  if(!body.groupId||!['JOIN','LEAVE'].includes(body.eventType))throw new Error('Evento de lead inválido');
  const group=(await db.query('SELECT id FROM promo_groups WHERE id=$1 AND account_id=$2',[String(body.groupId),accountId])).rows[0];
  if(!group)throw new Error('Grupo não pertence à conta');
  await db.query('INSERT INTO lead_events(account_id,group_id,event_type,phone_hash,ddd) VALUES($1,$2,$3,$4,$5)',[accountId,group.id,body.eventType,String(body.phoneHash||'').slice(0,128)||null,String(body.ddd||'').slice(0,3)||null]);
  await db.query('UPDATE webhook_events SET status=$1,item_count=1,processed_at=now() WHERE id=$2',['PROCESSED',eventId]);
  return {recorded:true};
}

async function sale(body,eventId,accountId){
  const items=Array.isArray(body.sales)?body.sales.slice(0,100):[],allowed=['AMAZON','SHOPEE','MERCADO_LIVRE'];let imported=0,rejected=0;
  for(const x of items){
    const marketplace=String(x.marketplace||'').toUpperCase(),externalId=String(x.externalId||'').slice(0,160),status=String(x.status||'PENDING').toUpperCase();
    if(!allowed.includes(marketplace)||!externalId||!['PENDING','APPROVED','CANCELLED','PAID'].includes(status)){rejected++;continue}
    const offerId=String(x.offerId||'').slice(0,100)||null,groupId=String(x.groupId||'').slice(0,100)||null;
    if(offerId&&!(await db.query('SELECT id FROM offers WHERE id=$1 AND account_id=$2',[offerId,accountId])).rows.length){rejected++;continue}
    if(groupId&&!(await db.query('SELECT id FROM promo_groups WHERE id=$1 AND account_id=$2',[groupId,accountId])).rows.length){rejected++;continue}
    const gross=Math.max(0,Math.round(Number(x.gross||0)*100)),commission=Math.max(0,Math.round(Number(x.commission||0)*100)),orderedAt=new Date(x.orderedAt||Date.now());
    if(Number.isNaN(orderedAt.getTime())){rejected++;continue}
    await db.query("INSERT INTO affiliate_sales(id,account_id,external_id,marketplace,offer_id,group_id,subid,gross_cents,commission_cents,status,ordered_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(account_id,marketplace,external_id) DO UPDATE SET offer_id=EXCLUDED.offer_id,group_id=EXCLUDED.group_id,subid=EXCLUDED.subid,gross_cents=EXCLUDED.gross_cents,commission_cents=EXCLUDED.commission_cents,status=EXCLUDED.status,ordered_at=EXCLUDED.ordered_at,updated_at=now()",[crypto.randomUUID(),accountId,externalId,marketplace,offerId,groupId,String(x.subid||'').slice(0,120),gross,commission,status,orderedAt.toISOString()]);imported++;
  }
  await db.query('UPDATE webhook_events SET status=$1,item_count=$2,processed_at=now() WHERE id=$3',['PROCESSED',imported,eventId]);
  return {imported,rejected};
}

export default async function(req,res){
  try{
    const body=req.body||{},accountId=String(body.accountId||'').slice(0,100);
    if(!accountId)return res.status(400).json({error:'accountId obrigatório.'});
    if(!(await db.query("SELECT id FROM accounts WHERE id=$1 AND status='ACTIVE'",[accountId])).rows.length)return res.status(404).json({error:'Conta inválida.'});
    const verified=await verify(req,accountId);
    if(verified===null)return res.status(503).json({error:'Ponte n8n aguardando configuração segura.'});
    if(!verified)return res.status(401).json({error:'Assinatura inválida.'});
    const action=String(body.action||''),eventKey=String(body.eventId||'').slice(0,160);
    if(!eventKey)return res.status(400).json({error:'eventId obrigatório.'});
    const eventId=await remember(eventKey,action,accountId);if(!eventId)return res.json({ok:true,duplicateEvent:true});
    let data;if(action==='ingest')data=await ingest(body,eventId,accountId);else if(action==='pull')data=await pull(body,eventId,accountId);else if(action==='result')data=await result(body,eventId,accountId);else if(action==='lead')data=await lead(body,eventId,accountId);else if(action==='sale')data=await sale(body,eventId,accountId);else return res.status(400).json({error:'Ação desconhecida.'});
    return res.json({ok:true,...data});
  }catch(e){return res.status(500).json({error:e?.message||'Falha na ponte n8n.'});}
}
