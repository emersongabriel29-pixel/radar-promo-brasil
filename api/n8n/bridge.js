import { db,config,webhooks } from 'hatchable';
import { validateOffer,categoryHint,offerScore,message,fingerprint,discount } from 'lib/automation.js';

export const access='public';
export const methods=['POST'];

async function verify(req){
  let secret;
  try{secret=await config.get('N8N_WEBHOOK_SECRET')}catch{return null}
  if(!secret)return false;
  const ts=String(req.headers['x-rpb-timestamp']||'');
  const sig=String(req.headers['x-rpb-signature']||'').replace(/^sha256=/,'');
  if(!ts||!sig)return false;
  return webhooks.verifyHmac({raw:ts+'.'+req.rawBody,signature:sig,secret,algorithm:'sha256',encoding:'hex',timestamp:ts,tolerance:300});
}

async function remember(eventKey,action){
  const r=await db.query('INSERT INTO webhook_events(provider,event_key,action) VALUES($1,$2,$3) ON CONFLICT(provider,event_key) DO NOTHING RETURNING id',['n8n',eventKey,action]);
  return r.rows[0]?.id||null;
}

async function ingest(body,eventId){
  const items=Array.isArray(body.offers)?body.offers.slice(0,50):[];
  const cats=(await db.query('SELECT id,name FROM categories')).rows;
  const settings=(await db.query("SELECT * FROM automation_settings WHERE id='default'")).rows[0]||{};
  let inserted=0,duplicates=0,rejected=[];
  for(const raw of items){
    const checked=validateOffer(raw);
    if(!checked.ok){rejected.push({title:String(raw?.title||'').slice(0,80),errors:checked.errors});continue}
    const v=checked.value,fp=await fingerprint(v),hint=categoryHint(v.title),category=cats.find(c=>c.name.toLowerCase()===hint.toLowerCase())||cats.find(c=>c.name.toLowerCase().includes('gerais'));
    const score=offerScore(v),id=crypto.randomUUID();
    const r=await db.query("INSERT INTO offers(id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,discount_percent,score,status,message,fingerprint,validation_status,imported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'APPROVED','N8N') ON CONFLICT(fingerprint) DO NOTHING RETURNING id",[id,v.title,v.source,v.originalPrice,v.currentPrice,category?.id||null,v.affiliateUrl,v.imageUrl,v.productUrl,v.couponUrl||null,discount(v.currentPrice,v.originalPrice),score,settings.auto_approve&&score>=settings.minimum_score?'APPROVED':'PENDING',message(v),fp]);
    if(!r.rows.length){duplicates++;continue}inserted++;
    if(settings.auto_approve&&score>=settings.minimum_score&&category){
      const groups=await db.query("SELECT id FROM promo_groups WHERE status='ACTIVE' AND (category_id=$1 OR category_id IS NULL)",[category.id]);
      for(const g of groups.rows)await db.query("INSERT INTO publications(id,offer_id,group_id,status,message,image_url,mode,idempotency_key) VALUES($1,$2,$3,'READY',$4,$5,'SMART',$6) ON CONFLICT(idempotency_key) DO NOTHING",[crypto.randomUUID(),id,g.id,message(v),v.imageUrl,fp+':'+g.id]);
    }
  }
  await db.query('UPDATE webhook_events SET status=$1,item_count=$2,processed_at=now() WHERE id=$3',['PROCESSED',inserted,eventId]);
  await db.query("INSERT INTO activity_log(event_type,title,details,status) VALUES('INGEST','Importação do n8n',$1,'SUCCESS')",[inserted+' nova(s), '+duplicates+' duplicada(s), '+rejected.length+' rejeitada(s).']);
  return {inserted,duplicates,rejected};
}

async function pull(body,eventId){
  const max=Math.max(1,Math.min(20,Number(body.limit)||10));
  const r=await db.query("SELECT p.id,p.message,p.image_url AS \"imageUrl\",p.attempts,o.title,o.affiliate_url AS \"affiliateUrl\",o.current_price AS \"currentPrice\",g.name AS \"groupName\",g.external_id AS \"groupExternalId\" FROM publications p JOIN offers o ON o.id=p.offer_id JOIN promo_groups g ON g.id=p.group_id WHERE p.status IN ('READY','RETRY') AND (p.next_attempt_at IS NULL OR p.next_attempt_at<=now()) AND g.status='ACTIVE' AND g.external_id IS NOT NULL AND p.image_url IS NOT NULL ORDER BY p.created_at LIMIT $1",[max]);
  for(const item of r.rows)await db.query("UPDATE publications SET status='DISPATCHING',attempts=attempts+1,last_attempt_at=now() WHERE id=$1 AND status IN ('READY','RETRY')",[item.id]);
  await db.query('UPDATE webhook_events SET status=$1,item_count=$2,processed_at=now() WHERE id=$3',['PROCESSED',r.rows.length,eventId]);
  return {items:r.rows};
}

async function result(body,eventId){
  const id=String(body.publicationId||''),ok=body.status==='PUBLISHED';
  if(!id)throw new Error('publicationId obrigatório');
  if(ok)await db.query("UPDATE publications SET status='PUBLISHED',published_at=now(),error_message=NULL WHERE id=$1",[id]);
  else await db.query("UPDATE publications SET status=CASE WHEN attempts<3 THEN 'RETRY' ELSE 'FAILED' END,error_message=$2,next_attempt_at=now()+interval '15 minutes' WHERE id=$1",[id,String(body.error||'Falha informada pelo n8n').slice(0,500)]);
  await db.query('UPDATE webhook_events SET status=$1,item_count=1,processed_at=now() WHERE id=$2',['PROCESSED',eventId]);
  return {updated:true};
}

async function lead(body,eventId){
  if(!body.groupId||!['JOIN','LEAVE'].includes(body.eventType))throw new Error('Evento de lead inválido');
  await db.query('INSERT INTO lead_events(group_id,event_type,phone_hash,ddd) VALUES($1,$2,$3,$4)',[String(body.groupId),body.eventType,String(body.phoneHash||'').slice(0,128)||null,String(body.ddd||'').slice(0,3)||null]);
  await db.query('UPDATE webhook_events SET status=$1,item_count=1,processed_at=now() WHERE id=$2',['PROCESSED',eventId]);
  return {recorded:true};
}

export default async function(req,res){
  try{
    const verified=await verify(req);
    if(verified===null)return res.status(503).json({error:'Ponte n8n aguardando configuração segura.'});
    if(!verified)return res.status(401).json({error:'Assinatura inválida.'});
    const body=req.body||{},action=String(body.action||''),eventKey=String(body.eventId||'').slice(0,160);
    if(!eventKey)return res.status(400).json({error:'eventId obrigatório.'});
    const eventId=await remember(eventKey,action);if(!eventId)return res.json({ok:true,duplicateEvent:true});
    let data;if(action==='ingest')data=await ingest(body,eventId);else if(action==='pull')data=await pull(body,eventId);else if(action==='result')data=await result(body,eventId);else if(action==='lead')data=await lead(body,eventId);else return res.status(400).json({error:'Ação desconhecida.'});
    return res.json({ok:true,...data});
  }catch(e){return res.status(500).json({error:e?.message||'Falha na ponte n8n.'});}
}
