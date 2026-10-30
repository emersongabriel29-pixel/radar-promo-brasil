import { db } from 'hatchable';
import { scoreAffiliateOpportunity } from 'lib/affiliate-intelligence.js';
export const access='member';
export const methods=['GET'];
async function accountFor(member){return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];}
const rows=r=>Array.isArray(r?.rows)?r.rows:[];
const n=v=>Math.max(0,Number(v)||0);
export default async function handler(req,res){
 if(!req.member)return res.status(401).json({error:'Entre para consultar a inteligência de afiliados.'});
 const account=await accountFor(req.member);if(!account)return res.status(412).json({error:'Conta Radar ativa não encontrada.'});
 try{
  const id=account.id;
  const [offers,clicks,sales,top,audits,credentials,catalog]=await Promise.all([
   db.query("SELECT source AS marketplace,COUNT(*) FILTER(WHERE status IN ('APPROVED','PUBLISHED'))::int AS approved_offers,COUNT(*) FILTER(WHERE status='PENDING')::int AS pending_offers FROM offers WHERE account_id=$1 GROUP BY source ORDER BY source",[id]),
   db.query("SELECT marketplace,COUNT(*)::int AS clicks FROM click_events WHERE account_id=$1 AND occurred_at>=now()-interval '30 days' GROUP BY marketplace",[id]),
   db.query("SELECT marketplace,COUNT(*)::int AS orders,COALESCE(SUM(commission_cents),0)::bigint AS commission_cents FROM affiliate_sales WHERE account_id=$1 AND ordered_at>=now()-interval '30 days' GROUP BY marketplace",[id]),
   db.query(`SELECT o.id,o.title,o.source AS marketplace,o.current_price,o.original_price,o.radar_score,o.score,o.affiliate_url,
    COALESCE(c.clicks,0)::int AS clicks_30d,COALESCE(s.orders,0)::int AS orders_30d,COALESCE(s.commission_cents,0)::bigint AS commission_cents_30d
    FROM offers o LEFT JOIN (SELECT offer_id,COUNT(*)::int AS clicks FROM click_events WHERE account_id=$1 AND occurred_at>=now()-interval '30 days' GROUP BY offer_id)c ON c.offer_id=o.id
    LEFT JOIN (SELECT offer_id,COUNT(*)::int AS orders,COALESCE(SUM(commission_cents),0)::bigint AS commission_cents FROM affiliate_sales WHERE account_id=$1 AND ordered_at>=now()-interval '30 days' AND offer_id IS NOT NULL GROUP BY offer_id)s ON s.offer_id=o.id
    WHERE o.account_id=$1 AND o.status IN ('APPROVED','PUBLISHED') ORDER BY COALESCE(o.radar_score,o.score,0) DESC,o.created_at DESC LIMIT 50`,[id]),
   db.query("SELECT DISTINCT ON (marketplace,operation) marketplace,operation,status,returned_count,total_available,page_count,checked_at,details FROM marketplace_api_audit WHERE account_id=$1 ORDER BY marketplace,operation,checked_at DESC",[id]),
   db.query("SELECT marketplace,status,last_checked_at,last_error FROM marketplace_api_credentials WHERE account_id=$1 ORDER BY marketplace",[id]),
   db.query("SELECT marketplace,kind,COUNT(*)::int AS records,MAX(last_seen_at) AS last_seen_at FROM affiliate_discovery_items WHERE account_id=$1 GROUP BY marketplace,kind ORDER BY marketplace,kind",[id])
  ]);
  const ranked=rows(top).map(x=>({...{id:x.id,title:x.title,marketplace:x.marketplace,currentPriceCents:n(x.current_price),originalPriceCents:x.original_price==null?null:n(x.original_price),affiliateUrl:x.affiliate_url,clicks30d:n(x.clicks_30d),orders30d:n(x.orders_30d),commissionCents30d:n(x.commission_cents_30d)},...scoreAffiliateOpportunity({radarScore:x.radar_score??x.score,clicks30d:x.clicks_30d,orders30d:x.orders_30d,commissionCents30d:x.commission_cents_30d})})).sort((a,b)=>b.score-a.score||b.clicks30d-a.clicks30d);
  const clickTotal=rows(clicks).reduce((s,x)=>s+n(x.clicks),0),orderTotal=rows(sales).reduce((s,x)=>s+n(x.orders),0),commissionTotal=rows(sales).reduce((s,x)=>s+n(x.commission_cents),0);
  return res.json({ok:true,windowDays:30,generatedAt:new Date().toISOString(),summary:{approvedOffers:rows(offers).reduce((s,x)=>s+n(x.approved_offers),0),clicks30d:clickTotal,orders30d:orderTotal,commissionCents30d:commissionTotal,conversionRate:clickTotal>0?Number((orderTotal/clickTotal*100).toFixed(2)):null,profitabilityStatus:'NOT_CALCULATED_COSTS_MISSING'},marketplaces:['LOMADEE','ALIEXPRESS','SHOPEE'].map(m=>({marketplace:m,offers:rows(offers).find(x=>x.marketplace===m)||{approved_offers:0,pending_offers:0},clicks30d:rows(clicks).find(x=>x.marketplace===m)?.clicks||0,sales:rows(sales).find(x=>x.marketplace===m)||{orders:0,commission_cents:0},credential:rows(credentials).find(x=>x.marketplace===m)||null})),latestAudits:rows(audits),discoveredCatalog:rows(catalog),rankedOffers:ranked,notes:['Pontuação é prioridade comercial, não lucro líquido.','Conversão fica nula quando não há cliques observados.','Comissão registrada não equivale a lucro; custos, estornos e devoluções precisam ser conciliados.','Auditoria de API não equivale a catálogo integral persistido.']});
 }catch(error){console.error('affiliate intelligence read failed',String(error?.message||'ERROR').slice(0,160));return res.status(503).json({error:'Não foi possível consolidar os indicadores. Confirme se a migration de inteligência foi aplicada.'});}
}
