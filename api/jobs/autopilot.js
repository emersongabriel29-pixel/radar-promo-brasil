import { db,scheduler } from 'hatchable';
import { calculateRadarScore } from 'lib/radar.js';
import { message } from 'lib/automation.js';

export const access='scheduler';
export const methods=['POST'];

const marketplaceName=value=>{
  const v=String(value||'').toUpperCase().replace(/[^A-Z0-9]+/g,'_');
  if(v.includes('MERCADO'))return 'MERCADO_LIVRE';
  if(v.includes('SHOPEE'))return 'SHOPEE';
  if(v.includes('AMAZON'))return 'AMAZON';
  return v;
};
const https=value=>{try{return new URL(String(value||'')).protocol==='https:'}catch{return false}};

export default async function(req,res){
  const accounts=(await db.query("SELECT DISTINCT account_id AS \"accountId\" FROM autopilot_rules WHERE status='ACTIVE'")).rows;
  let evaluated=0,queued=0,telegramQueued=0,whatsappQueued=0,blockedAffiliate=0;
  for(const account of accounts){
    const accountId=account.accountId;
    const rules=(await db.query("SELECT * FROM autopilot_rules WHERE account_id=$1 AND status='ACTIVE' ORDER BY min_score DESC",[accountId])).rows;
    const offers=(await db.query("SELECT * FROM offers WHERE account_id=$1 AND COALESCE(status,'READY') IN ('READY','APPROVED','PENDING') ORDER BY created_at DESC LIMIT 100",[accountId])).rows;
    const marketplaceRules=(await db.query("SELECT marketplace,status,affiliate_tag FROM marketplace_rules WHERE account_id=$1",[accountId])).rows;
    const activeMarketplaces=new Set(marketplaceRules.filter(x=>x.status==='ACTIVE'&&String(x.affiliate_tag||'').trim()).map(x=>x.marketplace));
    for(const offer of offers){
      evaluated++;
      if(!https(offer.image_url)||!https(offer.affiliate_url))continue;
      const marketplace=marketplaceName(offer.source);
      if(['MERCADO_LIVRE','SHOPEE','AMAZON'].includes(marketplace)&&!activeMarketplaces.has(marketplace)){blockedAffiliate++;continue}
      const radar=calculateRadarScore({
        currentPrice:offer.current_price,originalPrice:offer.original_price,
        lowestPrice:offer.price_lowest,averagePrice:offer.price_average,
        historyCount:offer.price_history_count,title:offer.title,
        coupon:Boolean(offer.coupon_url),categoryMatch:true
      });
      const discount=Number(offer.original_price)>Number(offer.current_price)
        ?Math.round((Number(offer.original_price)-Number(offer.current_price))*100/Number(offer.original_price)):0;
      const rule=rules.find(r=>radar.score>=Number(r.min_score||0)&&discount>=Number(r.min_discount||0)&&(!r.max_price||Number(offer.current_price)<=Number(r.max_price))&&(!r.require_price_history||Number(offer.price_history_count||0)>=3)&&(!r.category_id||String(r.category_id)===String(offer.category_id)));
      if(!rule)continue;
      const today=Number((await db.query("SELECT COUNT(*)::int AS count FROM publications WHERE account_id=$1 AND created_at>=date_trunc('day',now())",[accountId])).rows[0]?.count||0);
      if(today>=Math.max(1,Number(rule.max_publications_per_day||20)))break;
      const groups=(await db.query("SELECT id,platform FROM (SELECT id,platform,category_id,row_number() OVER(PARTITION BY platform ORDER BY CASE WHEN category_id=$2 THEN 0 ELSE 1 END,id) AS position FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND platform IN ('WHATSAPP','TELEGRAM') AND external_id IS NOT NULL AND (category_id=$2 OR category_id IS NULL)) destinations WHERE position=1",[accountId,offer.category_id])).rows;
      for(const group of groups){
        const key='radar:'+offer.id+':'+group.id+':'+new Date().toISOString().slice(0,10);
        const exists=(await db.query("SELECT id FROM publications WHERE account_id=$1 AND idempotency_key=$2 LIMIT 1",[accountId,key])).rows[0];
        if(exists)continue;
        await db.query("INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url,mode,priority,idempotency_key) VALUES($1,$2,$3,$4,'READY',$5,$6,'SMART',$7,$8)",[crypto.randomUUID(),accountId,offer.id,group.id,message(offer),offer.image_url,Math.min(100,radar.score),key]);
        queued++;
        if(group.platform==='TELEGRAM')telegramQueued++;else whatsappQueued++;
      }
    }
  }
  if(telegramQueued)await scheduler.now('/api/jobs/telegram');
  return res.json({ok:true,accounts:accounts.length,evaluated,queued,telegramQueued,whatsappQueued,blockedAffiliate});
}
