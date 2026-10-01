import { db,config,webhooks,scheduler } from 'hatchable';
import {ingestOffers} from 'lib/ingestion.js';
import { enqueueMatches } from 'lib/autopilot.js';
import { eligiblePublication,claimPublication } from 'lib/delivery.js';
import { moneyCents } from 'lib/validation.js';
import {offerImage} from 'lib/offer-images.js';
import {claimNextWhatsapp,reportWhatsappConnection} from 'lib/whatsapp-rotation.js';

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
  if(!master)return null;
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


async function pull(body,eventId,accountId){
  const max=Math.max(1,Math.min(20,Number(body.limit)||10));
  const r=await db.query(`SELECT p.id,p.content_type AS "contentType",p.message,p.image_url AS \"imageUrl\",COALESCE(p.image_storage_key,o.image_storage_key) AS \"imageStorageKey\",p.attempts,p.mention_all AS \"mentionAll\",o.title,o.affiliate_url AS \"affiliateUrl\",o.current_price AS \"currentPrice\",g.name AS \"groupName\",g.external_id AS \"groupExternalId\" FROM publications p LEFT JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.account_id=$1 AND p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.platform='WHATSAPP' AND NULLIF(trim(g.external_id),'') IS NOT NULL AND (p.content_type='MESSAGE' OR p.image_url IS NOT NULL) AND ${eligiblePublication} ORDER BY p.priority DESC,p.created_at,p.id LIMIT $2`,[accountId,max]);
  const claimedItems=[];
  for(const item of r.rows){
    const claimed=await claimNextWhatsapp(item.id,accountId);
    if(claimed)claimedItems.push({...item,...claimed,imageUrl:item.contentType==='MESSAGE'?null:await offerImage(item),attempts:item.attempts+1,deliveryContract:'rpb.v2'});
  }
  return {items:claimedItems};
}

async function result(body,eventId,accountId){
  const id=String(body.publicationId||''),ok=body.status==='PUBLISHED';
  if(!id||!['PUBLISHED','FAILED','UNKNOWN'].includes(body.status))throw Object.assign(new Error('Resultado de entrega inválido.'),{status:400});
  const current=(await db.query("SELECT p.status,p.dispatch_token,p.connection_id FROM publications p JOIN promo_groups g ON g.id=p.group_id AND g.account_id=p.account_id WHERE p.id=$1 AND p.account_id=$2 AND g.platform='WHATSAPP'",[id,accountId])).rows[0];
  if(!current)throw Object.assign(new Error('Publicação não encontrada.'),{status:404});
  if(!['DISPATCHING','WAITING_CONFIRMATION'].includes(current.status))throw Object.assign(new Error('Publicação não está aguardando confirmação.'),{status:409});
  if(ok&&!String(body.externalMessageId||'').trim())throw Object.assign(new Error('Informe o identificador oficial da entrega.'),{status:400});
  const token=String(body.dispatchToken||'');
  if(current.dispatch_token&&(token!==current.dispatch_token||String(body.connectionId||'')!==current.connection_id))throw Object.assign(new Error('Confirmação pertence a outra tentativa ou número.'),{status:409});
  const transaction=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:ok?
      "UPDATE whatsapp_connections SET failure_count=0,last_seen_at=now() WHERE account_id=$2 AND id=(SELECT connection_id FROM publications WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION') AND (dispatch_token IS NULL OR dispatch_token=$3::text))":
      "UPDATE whatsapp_connections SET failure_count=failure_count+1,status=CASE WHEN failure_count+1>=3 THEN 'DEGRADED' ELSE status END WHERE account_id=$2 AND $3='FAILED' AND id=(SELECT connection_id FROM publications WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION') AND (dispatch_token IS NULL OR dispatch_token=$4::text))",
      params:ok?[id,accountId,token]:[id,accountId,body.status,token]},
    {sql:ok?
      "UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL,external_message_id=$3 WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION') AND (dispatch_token IS NULL OR dispatch_token=$4::text) RETURNING id":
      "UPDATE publications SET status=CASE WHEN $3='UNKNOWN' THEN 'WAITING_CONFIRMATION' WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$4,next_attempt_at=now()+interval '15 minutes',connection_id=CASE WHEN $3='UNKNOWN' THEN connection_id ELSE NULL END WHERE id=$1 AND account_id=$2 AND status IN ('DISPATCHING','WAITING_CONFIRMATION') AND (dispatch_token IS NULL OR dispatch_token=$5::text) RETURNING id",
      params:ok?[id,accountId,String(body.externalMessageId).slice(0,200),token]:[id,accountId,body.status,body.status==='UNKNOWN'?'Entrega incerta. Confira o destino antes de reenviar.':String(body.error||'Falha confirmada pelo n8n').slice(0,500),token]}
  ]);
  if(!transaction.results[2].rows.length)throw Object.assign(new Error('Publicação já reconciliada.'),{status:409});
  return {updated:true};
}

async function lead(body,eventId,accountId){
  if(!body.groupId||!['JOIN','LEAVE'].includes(body.eventType))throw Object.assign(new Error('Evento de lead inválido'),{status:400});
  const group=(await db.query('SELECT id FROM promo_groups WHERE id=$1 AND account_id=$2',[String(body.groupId),accountId])).rows[0];
  if(!group)throw Object.assign(new Error('Grupo não pertence à conta'),{status:400});
  const hash=String(body.phoneHash||'').slice(0,128)||null;
  const r=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:"INSERT INTO lead_events(account_id,group_id,event_type,phone_hash,ddd,source_event_key) SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS(SELECT 1 FROM privacy_requests WHERE account_id=$1 AND subject_scope='LEAD' AND subject_hash=$4 AND status='DONE' AND request_type IN ('REVOCATION','DELETION')) ON CONFLICT DO NOTHING RETURNING id",params:[accountId,group.id,body.eventType,hash,String(body.ddd||'').slice(0,3)||null,eventId]}
  ]);
  return {recorded:r.results[1].rows.length>0};
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
    if(!['ingest','pull','result','lead','sale','connection','connections','ping'].includes(action))return res.status(400).json({error:'Ação desconhecida.'});
    if(!eventKey)return res.status(400).json({error:'eventId obrigatório.'});
    const event=await remember(eventKey,action,accountId);
    if(event.duplicate)return res.json({ok:true,...event.response,duplicateEvent:true});
    if(event.busy)return res.status(409).json({error:'Evento em processamento ou reutilizado para outra ação.'});
    eventId=event.id;
    let data;if(action==='ingest')data=await ingestOffers(body,eventId,accountId);else if(action==='pull')data=await pull(body,eventId,accountId);else if(action==='result')data=await result(body,eventId,accountId);else if(action==='lead')data=await lead(body,eventId,accountId);else if(action==='sale')data=await sale(body,eventId,accountId);else if(action==='connection')data=await reportWhatsappConnection(accountId,body);else if(action==='connections')data={connections:(await db.query("SELECT id,name,phone_number AS \"phoneNumber\",provider,external_id AS \"externalId\",status FROM whatsapp_connections WHERE account_id=$1 AND status<>'ARCHIVED' ORDER BY created_at,id",[accountId])).rows};else data={accountId,bridge:'rpb.v2',checkedAt:new Date().toISOString()};
    await db.query("UPDATE webhook_events SET status='PROCESSED',response=$2,item_count=$3,processed_at=now(),updated_at=now() WHERE id=$1",[eventId,JSON.stringify(data),data.inserted||data.items?.length||data.imported||1]);
    return res.json({ok:true,...data});
  }catch(e){
    if(eventId)await db.query("UPDATE webhook_events SET status='FAILED',updated_at=now() WHERE id=$1 AND status='PROCESSING'",[eventId]);
    const correlationId=crypto.randomUUID();if(!e.status)console.error('n8n/bridge',correlationId,e.code||e.name);
    return res.status(e.status||500).json({error:e.status?e.message:'Não foi possível processar o evento. Repita com o mesmo eventId.',correlationId});
  }
}
