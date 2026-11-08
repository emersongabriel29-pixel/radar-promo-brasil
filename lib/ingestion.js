import {db} from 'hatchable';
import {validateOffer,categoryHint,offerScore,message,fingerprint,discount} from './automation.js';
import {enqueueMatches} from './autopilot.js';

async function ingestChunk(body,eventId,accountId,options={}){
  let monitor=options.monitor||null;
  if(body.monitorId||monitor){
    monitor=(await db.query("SELECT * FROM monitors WHERE id=$1 AND account_id=$2 AND status='ACTIVE' AND source_authorized",[body.monitorId||monitor.id,accountId])).rows[0];
    if(!monitor)throw Object.assign(new Error('Monitor não pertence à conta, está pausado ou não foi autorizado.'),{status:404});
  }
  const items=Array.isArray(body.offers)?body.offers:[];
  const cats=(await db.query('SELECT id,name FROM categories WHERE account_id=$1',[accountId])).rows;
  const settings=(await db.query('SELECT * FROM account_settings WHERE account_id=$1',[accountId])).rows[0]||{};
  let inserted=0,duplicates=0,rejected=[],offerIds=[];
  for(const raw of items){
    const checked=validateOffer(raw);
    if(!checked.ok){rejected.push({title:String(raw?.title||'').slice(0,80),errors:checked.errors});continue}
    const v=checked.value,fp=await fingerprint(v),hint=categoryHint(v.title,v.source),category=cats.find(c=>c.name.toLowerCase()===hint.toLowerCase())||cats.find(c=>c.name.toLowerCase().includes('gerais'));
    const score=offerScore(v),id=crypto.randomUUID();
    const categoryId=monitor?.category_id||category?.id||null;
    const existing=(await db.query('SELECT id,current_price FROM offers WHERE account_id=$1 AND fingerprint=$2',[accountId,fp])).rows[0];
    const r=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,source_monitor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'APPROVED',$18,$19) ON CONFLICT(account_id,fingerprint) WHERE fingerprint IS NOT NULL DO UPDATE SET current_price=EXCLUDED.current_price,original_price=EXCLUDED.original_price,coupon_url=EXCLUDED.coupon_url,coupon_code=EXCLUDED.coupon_code,image_url=EXCLUDED.image_url,affiliate_url=EXCLUDED.affiliate_url,discount_percent=EXCLUDED.discount_percent,score=EXCLUDED.score,message=EXCLUDED.message,source_monitor_id=COALESCE(offers.source_monitor_id,EXCLUDED.source_monitor_id),updated_at=now() RETURNING id",[id,accountId,v.title,v.source,v.originalPrice,v.currentPrice,categoryId,v.affiliateUrl,v.imageUrl,v.productUrl,v.couponUrl||null,v.couponCode||null,discount(v.currentPrice,v.originalPrice),score,!options.reviewOnly&&settings.auto_approve&&score>=settings.minimum_score?'APPROVED':'PENDING',message(v),fp,options.importedBy||'N8N',monitor?.id||null]);
    offerIds.push(r.rows[0].id);
    if(existing)duplicates++;else inserted++;
    await db.transaction([
      {sql:'INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',params:[(options.importedBy||'N8N')+':'+eventId+':'+fp,accountId,r.rows[0].id,v.currentPrice,v.originalPrice]},
      {sql:`UPDATE offers SET price_first_seen=COALESCE(price_first_seen,$3),
        price_lowest=(SELECT min(price) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2),
        price_highest=(SELECT max(price) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2),
        price_average=(SELECT round(avg(price)) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2),
        price_history_count=(SELECT count(*) FROM offer_price_history WHERE account_id=$1 AND offer_id=$2) WHERE account_id=$1 AND id=$2`,params:[accountId,r.rows[0].id,existing?.current_price??v.currentPrice]}
    ]);
    await db.query("UPDATE publications SET message=$3,image_url=$4 WHERE account_id=$1 AND offer_id=$2 AND status IN ('READY','RETRY','SCHEDULED')",[accountId,r.rows[0].id,message(v),v.imageUrl]);
  }
  await db.query("INSERT INTO activity_log(account_id,event_type,title,details,status) VALUES($1,'INGEST',$3,$2,'SUCCESS')",[accountId,inserted+' nova(s), '+duplicates+' duplicada(s), '+rejected.length+' rejeitada(s).',monitor?'Captura da origem autorizada':'Importação do n8n']);
  if(monitor)await db.query("UPDATE monitors SET captured_count=(SELECT count(*) FROM offers WHERE account_id=$1 AND source_monitor_id=$2),last_run_at=now(),last_error='' WHERE id=$2 AND account_id=$1",[accountId,monitor.id]);
  const queued=!options.deferQueue&&offerIds.length?await enqueueMatches(accountId,'',{offerIds}):{queued:0};
  return {inserted,duplicates,rejected,queued:queued.queued,offerIds};
}



const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const completed=row=>['COMPLETED','COMPLETED_WITH_REVIEW'].includes(row.state);
export async function ingestOffers(body,eventId,accountId,options={}){
  if(!Array.isArray(body?.offers))throw fail('O lote precisa conter uma lista de ofertas.');
  const event=String(eventId||'').trim();
  if(!event||event.length>512)throw fail('Identificador de evento ausente ou longo demais.');
  const payload={offers:body.offers,monitorId:body.monitorId||options.monitor?.id||null};
  if(payload.monitorId&&!(await db.query("SELECT id FROM monitors WHERE id=$1 AND account_id=$2 AND status='ACTIVE' AND source_authorized",[payload.monitorId,accountId])).rows.length)throw fail('Monitor não pertence à conta, está pausado ou não foi autorizado.',404);
  const savedOptions={reviewOnly:options.reviewOnly===true,importedBy:String(options.importedBy||'N8N')};
  // Persist the complete input before processing; a limit controls pace, never acceptance.
  await db.query("INSERT INTO ingestion_batches(id,account_id,event_id,payload,options) VALUES($1,$2,$3,$4::jsonb,$5::jsonb) ON CONFLICT(account_id,event_id) DO NOTHING",[crypto.randomUUID(),accountId,event,JSON.stringify(payload),JSON.stringify(savedOptions)]);
  const row=(await db.query("SELECT id,payload=$3::jsonb AND options=$4::jsonb AS same_payload FROM ingestion_batches WHERE account_id=$1 AND event_id=$2",[accountId,event,JSON.stringify(payload),JSON.stringify(savedOptions)])).rows[0];
  if(!row?.same_payload)throw fail('Este evento já existe com outro conteúdo. Use um novo identificador.',409);
  return processIngestionBatch(row.id,accountId,options);
}

export async function processIngestionBatch(batchId,accountId,{maxItems=25,budgetMs=20000}={}){
  const token=crypto.randomUUID();
  const row=(await db.query(`UPDATE ingestion_batches SET state='PROCESSING',lease_token=$3,lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now()
    WHERE id=$1 AND account_id=$2 AND ((state IN ('PENDING','WAITING_CAPACITY','RETRY') AND next_attempt_at<=now()) OR (state='PROCESSING' AND lease_until<now()))
    RETURNING *`,[batchId,accountId,token])).rows[0];
  if(!row){
    const existing=(await db.query('SELECT id,state,cursor,payload FROM ingestion_batches WHERE id=$1 AND account_id=$2',[batchId,accountId])).rows[0];
    if(!existing)throw fail('Lote não encontrado nesta conta.',404);
    return {batchId,inserted:0,duplicates:0,rejected:[],queued:0,cursor:existing.cursor,total:existing.payload.offers.length,pending:!completed(existing),complete:completed(existing)};
  }
  const items=row.payload.offers,limit=Math.max(1,Math.min(50,Math.floor(Number(maxItems)||25)));
  const deadline=Date.now()+Math.max(100,Math.min(30000,Number(budgetMs)||20000));
  let cursor=Number(row.cursor)||0,inserted=0,duplicates=0,queued=0,rejected=[],processed=0,offerIds=[];
  try{
    while(cursor<items.length&&processed<limit&&Date.now()<deadline){
      // Replaying a checkpoint is safe: offers and price events already have stable unique keys.
      const result=await ingestChunk({offers:[items[cursor]],monitorId:row.payload.monitorId},row.event_id,accountId,{...row.options,deferQueue:true});
      inserted+=result.inserted;duplicates+=result.duplicates;offerIds.push(...result.offerIds);
      rejected.push(...result.rejected.map(x=>({...x,index:cursor})));
      const update=await db.query(`UPDATE ingestion_batches SET cursor=$4,inserted_count=inserted_count+$5,duplicate_count=duplicate_count+$6,rejected=rejected||$7::jsonb,updated_at=now()
        WHERE id=$1 AND account_id=$2 AND lease_token=$3 RETURNING id`,[batchId,accountId,token,cursor+1,result.inserted,result.duplicates,JSON.stringify(result.rejected.map(x=>({...x,index:cursor})))]);
      if(!update.rows.length)throw fail('O lease do lote mudou; processamento interrompido.',409);
      cursor++;processed++;
    }
    if(offerIds.length)queued=(await enqueueMatches(accountId,'',{offerIds})).queued;
    const done=cursor>=items.length;
    const updated=(await db.query(`UPDATE ingestion_batches SET state=CASE WHEN $4 THEN CASE WHEN jsonb_array_length(rejected)>0 THEN 'COMPLETED_WITH_REVIEW' ELSE 'COMPLETED' END ELSE 'WAITING_CAPACITY' END,lease_token=NULL,lease_until=NULL,last_error='',next_attempt_at=now(),updated_at=now()
      WHERE id=$1 AND account_id=$2 AND lease_token=$3 RETURNING state`,[batchId,accountId,token,done])).rows[0];
    if(!updated)throw fail('O lease do lote mudou.',409);
    return {batchId,inserted,duplicates,rejected,queued,cursor,total:items.length,pending:!done,complete:done};
  }catch(error){
    await db.query("UPDATE ingestion_batches SET state='RETRY',lease_token=NULL,lease_until=NULL,last_error=$4,next_attempt_at=now()+interval '5 minutes',updated_at=now() WHERE id=$1 AND account_id=$2 AND lease_token=$3",[batchId,accountId,token,String(error?.code||error?.status||'INGESTION_RETRY').slice(0,80)]);
    throw error;
  }
}
