import { db,config,webhooks,scheduler } from 'hatchable';
import { validateOffer,categoryHint,offerScore,message,fingerprint,discount } from 'lib/automation.js';
import { enqueueMatches } from 'lib/autopilot.js';
import { eligiblePublication,claimPublication } from 'lib/delivery.js';
import { moneyCents } from 'lib/validation.js';
import {offerImage} from 'lib/offer-images.js';

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
  const r=await db.query("INSERT INTO webhook_events(provider,event_key,action,account_id,status) VALUES($1,$2,$3,$4,'PROCESSING') ON CONFLICT(provider,event_key) DO UPDATE SET status='PROCESSING',updated_at=now() WHERE webhook_events.action=EXCLUDED.action AND (webhook_events.status='FAILED' OR (webhook_events.status IN ('PROCESSING','RECEIVED') AND webhook_events.updated_at<now()-interval '5 minutes')) RETURNING id",['n8n',scopedKey,action,accountId]);
  if(r.rows[0])return {id:r.rows[0].id};
  const old=(await db.query('SELECT status,response,action FROM webhook_events WHERE provider=$1 AND event_key=$2 AND account_id=$3',['n8n',scopedKey,accountId])).rows[0];
  return old?.status==='PROCESSED'&&old.action===action?{duplicate:true,response:old.response||{}}:{busy:true};
}

async function ingest(body,eventId,accountId){
  const items=Array.isArray(body.offers)?body.offers.slice(0,50):[];
  const cats=(await db.query('SELECT id,name FROM categories WHERE account_id=$1',[accountId])).rows;
  const settings=(await db.query('SELECT * FROM account_settings WHERE account_id=$1',[accountId])).rows[0]||{};
  let inserted=0,duplicates=0,rejected=[];
  for(const raw of items){
    const checked=validateOffer(raw);
    if(!checked.ok){rejected.push({title:String(raw?.title||'').slice(0,80),errors:checked.errors});continue}
    const v=checked.value,fp=await fingerprint(v),hint=categoryHint(v.title,v.source),category=cats.find(c=>c.name.toLowerCase()===hint.toLowerCase())||cats.find(c=>c.name.toLowerCase().includes('gerais'));
    const score=offerScore(v),id=crypto.randomUUID();
    const existing=(await db.query('SELECT id,current_price FROM offers WHERE account_id=$1 AND fingerprint=$2',[accountId,fp])).rows[0];
    const r=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'APPROVED','N8N') ON CONFLICT(account_id,fingerprint) WHERE fingerprint IS NOT NULL DO UPDATE SET current_price=EXCLUDED.current_price,original_price=EXCLUDED.original_price,coupon_url=EXCLUDED.coupon_url,coupon_code=EXCLUDED.coupon_code,image_url=EXCLUDED.image_url,affiliate_url=EXCLUDED.affiliate_url,discount_percent=EXCLUDED.discount_percent,score=EXCLUDED.score,message=EXCLUDED.message,updated_at=now() RETURNING id",[id,accountId,v.title,v.source,v.originalPrice,v.currentPrice,category?.id||null,v.affiliateUrl,v.imageUrl,v.productUrl,v.couponUrl||null,v.couponCode||null,discount(v.currentPrice,v.originalPrice),score,settings.auto_approve&&score>=settings.minimum_score?'APPROVED':'PENDING',message(v),fp]);
    if(existing)duplicates++;else inserted++;
    await db.transaction([
      {sql:'INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',params:['n8n:'+eventId+':'+fp,accountId,r.rows[0].id,v.currentPrice,v.originalPrice]},
      {sql:`UPDATE offers SET price_first_seen=COALESCE(price_first_seen,$3),
        price_lowest=(SELECT min(price) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2),
        price_highest=(SELECT max(price) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2),
        price_average=(SELECT round(avg(price)) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2),
        price_history_count=(SELECT count(*) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2) WHERE account_id=$1 AND id=$2`,params:[accountId,r.rows[0].id,existing?.current_price??v.currentPrice]}
    ]);
    await db.query("UPDATE publications SET message=$3,image_url=$4 WHERE account_id=$1 AND offer_id=$2 AND status IN ('READY','RETRY','SCHEDULED')",[accountId,r.rows[0].id,message(v),v.imageUrl]);
  }
  await db.query("INSERT INTO activity_log(account_id,event_type,title,details,status) VALUES($1,'INGEST','Importação do n8n',$2,'SUCCESS')",[accountId,inserted+' nova(s), '+duplicates+' duplicada(s), '+rejected.length+' rejeitada(s).']);
  const queued=await enqueueMatches(accountId);
  return {inserted,duplicates,rejected,queued:queued.queued};
}

async function pull(body,eventId,accountId){
  const max=Math.max(1,Math.min(20,Number(body.limit)||10));
  const r=await db.query(`SELECT p.id,p.message,p.image_url AS \"imageUrl\",COALESCE(p.image_storage_key,o.image_storage_key) AS \"imageStorageKey\",p.attempts,p.mention_all AS \"mentionAll\",o.title,o.affiliate_url AS \"affiliateUrl\",o.current_price AS \"currentPrice\",g.name AS \"groupName\",g.external_id AS \"groupExternalId\",c.id AS \"connectionId\",c.provider AS \"connectionProvider\",c.external_id AS \"connectionExternalId\" FROM publications p JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id LEFT JOIN LATERAL (SELECT w.* FROM whatsapp_connections w WHERE w.account_id=p.account_id AND w.status='ACTIVE' ORDER BY w.failure_count,w.priority,w.last_seen_at DESC NULLS LAST LIMIT 1) c ON true WHERE p.account_id=$1 AND p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.platform='WHATSAPP' AND g.external_id IS NOT NULL AND p.image_url IS NOT NULL AND ${eligiblePublication} ORDER BY p.priority DESC,p.created_at DESC LIMIT $2`,[accountId,max]);
  const claimedItems=[];
  for(const item of r.rows){
    if(!item.connectionId)continue;
    if(await claimPublication(db,item.id,accountId,item.connectionId))claimedItems.push({...item,imageUrl:await offerImage(item)});
  }
  return {items:claimedItems};
}

async function result(body,eventId,accountId){
  const id=String(body.publicationId||''),ok=body.status==='PUBLISHED';
  if(!id||!['PUBLISHED','FAILED','UNKNOWN'].includes(body.status))throw Object.assign(new Error('Resultado de entrega inválido.'),{status:400});
  const current=(await db.query('SELECT status FROM publications WHERE id=$1 AND account_id=$2',[id,accountId])).rows[0];
  if(!current)throw Object.assign(new Error('Publicação não encontrada.'),{status:404});
  if(!['DISPATCHING','WAITING_CONFIRMATION'].includes(current.status))throw Object.assign(new Error('Publicação não está aguardando confirmação.'),{status:409});
  if(ok&&!String(body.externalMessageId||'').trim())throw Object.assign(new Error('Informe o identificador oficial da entrega.'),{status:400});
  const transaction=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:ok?
      "UPDATE whatsapp_connections SET failure_count=0,last_seen_at=now() WHERE account_id=$2 AND id=(SELECT connection_id FROM publications WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION'))":
      "UPDATE whatsapp_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END WHERE account_id=$2 AND $3='FAILED' AND id=(SELECT connection_id FROM publications WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION'))",
      params:ok?[id,accountId]:[id,accountId,body.status]},
    {sql:ok?
      "UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,external_message_id=$3 WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION') RETURNING id":
      "UPDATE publications SET status=CASE WHEN $3='UNKNOWN' THEN 'WAITING_CONFIRMATION' WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$4,next_attempt_at=now()+interval '15 minutes',connection_id=CASE WHEN $3='UNKNOWN' THEN connection_id ELSE NULL END WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION') RETURNING id",
      params:ok?[id,accountId,String(body.externalMessageId).slice(0,200)]:[id,accountId,body.status,body.status==='UNKNOWN'?'Entrega incerta. Confira o destino antes de reenviar.':String(body.error||'Falha confirmada pelo n8n').slice(0,500)]}
  ]);
  if(!transaction.results[2].rows.length)throw Object.assign(new Error('Publicação já reconciliada.'),{status:409});
  return {updated:true};
}

async function lead(body,eventId,accountId){
  if(!body.groupId||!['JOIN','LEAVE'].includes(body.eventType))throw Object.assign(new Error('Evento de lead inválido'),{status:400});
  const group=(await db.query('SELECT id FROM promo_groups WHERE id=$1 AND account_id=$2',[String(body.groupId),accountId])).rows[0];
  if(!group)throw Object.assign(new Error('Grupo não pertence à conta'),{status:400});
  await db.query('INSERT INTO lead_events(account_id,group_id,event_type,phone_hash,ddd,source_event_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[accountId,group.id,body.eventType,String(body.phoneHash||'').slice(0,128)||null,String(body.ddd||'').slice(0,3)||null,eventId]);
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
    const gross=moneyCents(x.gross??0),commission=moneyCents(x.commission??0),orderedAt=new Date(x.orderedAt||Date.now());
    if(!Number.isFinite(gross)||!Number.isFinite(commission)||Number.isNaN(orderedAt.getTime())){rejected++;continue}
    await db.query("INSERT INTO affiliate_sales(id,account_id,external_id,marketplace,offer_id,group_id,subid,gross_cents,commission_cents,status,ordered_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(account_id,marketplace,external_id) DO UPDATE SET offer_id=EXCLUDED.offer_id,group_id=EXCLUDED.group_id,subid=EXCLUDED.subid,gross_cents=EXCLUDED.gross_cents,commission_cents=EXCLUDED.commission_cents,status=EXCLUDED.status,ordered_at=EXCLUDED.ordered_at,updated_at=now()",[crypto.randomUUID(),accountId,externalId,marketplace,offerId,groupId,String(x.subid||'').slice(0,120),gross,commission,status,orderedAt.toISOString()]);imported++;
  }
  return {imported,rejected};
}

export default async function(req,res){
  let eventId;
  try{
    const body=req.body||{},accountId=String(body.accountId||'').slice(0,100);
    if(!accountId)return res.status(400).json({error:'accountId obrigatório.'});
    if(!(await db.query("SELECT id FROM accounts WHERE id=$1 AND status='ACTIVE'",[accountId])).rows.length)return res.status(404).json({error:'Conta inválida.'});
    const verified=await verify(req,accountId);
    if(verified===null)return res.status(503).json({error:'Ponte n8n aguardando configuração segura.'});
    if(!verified)return res.status(401).json({error:'Assinatura inválida.'});
    const action=String(body.action||''),eventKey=String(body.eventId||'').slice(0,160);
    if(!['ingest','pull','result','lead','sale'].includes(action))return res.status(400).json({error:'Ação desconhecida.'});
    if(!eventKey)return res.status(400).json({error:'eventId obrigatório.'});
    const event=await remember(eventKey,action,accountId);
    if(event.duplicate)return res.json({ok:true,...event.response,duplicateEvent:true});
    if(event.busy)return res.status(409).json({error:'Evento em processamento ou reutilizado para outra ação.'});
    eventId=event.id;
    let data;if(action==='ingest')data=await ingest(body,eventId,accountId);else if(action==='pull')data=await pull(body,eventId,accountId);else if(action==='result')data=await result(body,eventId,accountId);else if(action==='lead')data=await lead(body,eventId,accountId);else if(action==='sale')data=await sale(body,eventId,accountId);else return res.status(400).json({error:'Ação desconhecida.'});
    await db.query("UPDATE webhook_events SET status='PROCESSED',response=$2,item_count=$3,processed_at=now(),updated_at=now() WHERE id=$1",[eventId,JSON.stringify(data),data.inserted||data.items?.length||data.imported||1]);
    return res.json({ok:true,...data});
  }catch(e){
    if(eventId)await db.query("UPDATE webhook_events SET status='FAILED',updated_at=now() WHERE id=$1 AND status='PROCESSING'",[eventId]);
    const correlationId=crypto.randomUUID();if(!e.status)console.error('n8n/bridge',correlationId,e.code||e.name);
    return res.status(e.status||500).json({error:e.status?e.message:'Não foi possível processar o evento. Repita com o mesmo eventId.',correlationId});
  }
}
