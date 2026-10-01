import {db} from 'hatchable';
import {validateOffer,categoryHint,offerScore,message,fingerprint,discount} from './automation.js';
import {enqueueMatches} from './autopilot.js';

export async function ingestOffers(body,eventId,accountId,options={}){
  let monitor=options.monitor||null;
  if(body.monitorId||monitor){
    monitor=(await db.query("SELECT * FROM monitors WHERE id=$1 AND account_id=$2 AND status='ACTIVE' AND source_authorized",[body.monitorId||monitor.id,accountId])).rows[0];
    if(!monitor)throw Object.assign(new Error('Monitor não pertence à conta, está pausado ou não foi autorizado.'),{status:404});
  }
  const items=Array.isArray(body.offers)?body.offers.slice(0,50):[];
  const cats=(await db.query('SELECT id,name FROM categories WHERE account_id=$1',[accountId])).rows;
  const settings=(await db.query('SELECT * FROM account_settings WHERE account_id=$1',[accountId])).rows[0]||{};
  let inserted=0,duplicates=0,rejected=[];
  for(const raw of items){
    const checked=validateOffer(raw);
    if(!checked.ok){rejected.push({title:String(raw?.title||'').slice(0,80),errors:checked.errors});continue}
    const v=checked.value,fp=await fingerprint(v),hint=categoryHint(v.title,v.source),category=cats.find(c=>c.name.toLowerCase()===hint.toLowerCase())||cats.find(c=>c.name.toLowerCase().includes('gerais'));
    const score=offerScore(v),id=crypto.randomUUID();
    const categoryId=monitor?.category_id||category?.id||null;
    const existing=(await db.query('SELECT id,current_price FROM offers WHERE account_id=$1 AND fingerprint=$2',[accountId,fp])).rows[0];
    const r=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,source_monitor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'APPROVED',$18,$19) ON CONFLICT(account_id,fingerprint) WHERE fingerprint IS NOT NULL DO UPDATE SET current_price=EXCLUDED.current_price,original_price=EXCLUDED.original_price,coupon_url=EXCLUDED.coupon_url,coupon_code=EXCLUDED.coupon_code,image_url=EXCLUDED.image_url,affiliate_url=EXCLUDED.affiliate_url,discount_percent=EXCLUDED.discount_percent,score=EXCLUDED.score,message=EXCLUDED.message,source_monitor_id=COALESCE(offers.source_monitor_id,EXCLUDED.source_monitor_id),updated_at=now() RETURNING id",[id,accountId,v.title,v.source,v.originalPrice,v.currentPrice,categoryId,v.affiliateUrl,v.imageUrl,v.productUrl,v.couponUrl||null,v.couponCode||null,discount(v.currentPrice,v.originalPrice),score,!options.reviewOnly&&settings.auto_approve&&score>=settings.minimum_score?'APPROVED':'PENDING',message(v),fp,options.importedBy||'N8N',monitor?.id||null]);
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
  const queued=await enqueueMatches(accountId);
  return {inserted,duplicates,rejected,queued:queued.queued};
}

