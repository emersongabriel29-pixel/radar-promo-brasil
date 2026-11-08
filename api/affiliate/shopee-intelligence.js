import { db } from 'hatchable';
export const access='member';
export const methods=['GET'];
const rows=r=>Array.isArray(r?.rows)?r.rows:[];
const num=v=>v==null?null:Number(v);
const pct=(a,b)=>b>0?Number(((a-b)/b*100).toFixed(1)):null;
async function accountFor(member){
 return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];
}
export default async function handler(req,res){
 if(!req.member)return res.status(401).json({error:'Entre para consultar a inteligência Shopee.'});
 const account=await accountFor(req.member);
 if(!account)return res.status(412).json({error:'Conta Radar ativa não encontrada.'});
 try{
  const [catalog,history,categories,stats]=await Promise.all([
   db.query(`SELECT d.external_id AS product_id,d.title,d.category_slug,d.source_keyword,d.price_cents,d.sales_count,d.rating,d.commission_rate,d.image_url,d.product_url,d.affiliate_url,d.last_seen_at,d.raw_data,
    prior.sales_count AS prior_sales_count,prior.captured_at AS prior_captured_at,
    COALESCE(o.status,'DISCOVERED') AS offer_status
    FROM affiliate_discovery_items d
    LEFT JOIN LATERAL (
      SELECT sales_count,captured_at FROM affiliate_discovery_snapshots s
      WHERE s.account_id=d.account_id AND s.marketplace=d.marketplace AND s.kind=d.kind AND s.external_id=d.external_id
        AND s.captured_at<=now()-interval '7 days'
      ORDER BY s.captured_at DESC LIMIT 1
    ) prior ON true
    LEFT JOIN offers o ON o.id=d.offer_id AND o.account_id=d.account_id
    WHERE d.account_id=$1 AND d.marketplace='SHOPEE' AND d.kind='PRODUCT'
      AND d.last_seen_at>=now()-interval '30 days'
    ORDER BY d.sales_count DESC NULLS LAST,d.last_seen_at DESC LIMIT 1000`,[account.id]),
   db.query(`SELECT COUNT(*)::int AS snapshots,MIN(captured_at) AS first_snapshot,MAX(captured_at) AS last_snapshot
    FROM affiliate_discovery_snapshots WHERE account_id=$1 AND marketplace='SHOPEE' AND kind='PRODUCT'`,[account.id]),
   db.query(`SELECT COALESCE(NULLIF(category_slug,''),'sem_categoria') AS category,
    COUNT(*)::int AS products,ROUND(AVG(sales_count),1) AS average_sales,
    percentile_cont(0.5) WITHIN GROUP(ORDER BY sales_count) AS median_sales,
    ROUND(AVG(rating),2) AS average_rating,
    COUNT(*) FILTER(WHERE sales_count IS NOT NULL)::int AS sales_sample,
    COUNT(*) FILTER(WHERE rating IS NOT NULL)::int AS rating_sample
    FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='SHOPEE' AND kind='PRODUCT'
      AND last_seen_at>=now()-interval '30 days'
    GROUP BY COALESCE(NULLIF(category_slug,''),'sem_categoria') ORDER BY products DESC LIMIT 30`,[account.id]),
   db.query(`SELECT COUNT(*)::int AS products_observed,
    COUNT(*) FILTER(WHERE sales_count IS NOT NULL)::int AS products_with_sales,
    COUNT(*) FILTER(WHERE rating IS NOT NULL)::int AS products_with_rating,
    ROUND(AVG(sales_count),1) AS average_sales,
    percentile_cont(0.5) WITHIN GROUP(ORDER BY sales_count) AS median_sales,
    ROUND(AVG(rating),2) AS average_rating,
    COUNT(*) FILTER(WHERE raw_data->>'isOfficialShop'='true')::int AS official_shop_products
    FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='SHOPEE' AND kind='PRODUCT'
      AND last_seen_at>=now()-interval '30 days'`,[account.id])
  ]);
  const products=rows(catalog).map(x=>{
   const sales=num(x.sales_count),rating=num(x.rating),prior=num(x.prior_sales_count);
   const growth= sales!=null&&prior!=null?pct(sales,prior):null;
   // Quality (buyer star average) leads the score; sales are popularity, never review count.
   const salesScore=sales==null?0:Math.min(100,Math.log10(sales+1)*25);
   const ratingScore=rating==null?0:Math.max(0,Math.min(100,rating/5*100));
   const growthScore=growth==null?0:growth>=50?100:growth>=20?85:growth>=0?65:growth>=-20?35:10;
   const completeness=(rating!=null?0.55:0)+(sales!=null?0.30:0)+(growth!=null?0.15:0);
   const shopType=String(x.raw_data?.shopType||'');
   const shopTypeCodes=shopType.split(',').map(Number).filter(Number.isFinite);
   const isOfficialShop=x.raw_data?.isOfficialShop===true||shopTypeCodes.includes(1);
   const baseScore=(ratingScore*.55+salesScore*.30+growthScore*.15)*completeness;
   return {productId:x.product_id,title:x.title,category:x.category_slug||'sem_categoria',sales,rating,reviewCount:null,reviewCountAvailable:false,ratingScore:rating==null?null:Math.round(ratingScore),salesScore:sales==null?null:Math.round(salesScore),isOfficialShop,shopType:shopType||null,
    priceCents:num(x.price_cents),commissionRate:num(x.commission_rate),imageUrl:x.image_url,productUrl:x.product_url,affiliateUrl:x.affiliate_url,
    salesGrowth7dPercent:growth,priorSalesCount:prior,priorCapturedAt:x.prior_captured_at,lastSeenAt:x.last_seen_at,
    offerStatus:x.offer_status,score:Math.min(100,Math.round(baseScore+(isOfficialShop?7:0))),
    confidence:Math.round(completeness*100)};
  });
  const salesRank=[...products].filter(x=>x.sales!=null).sort((a,b)=>b.sales-a.sales).slice(0,30);
  const ratingRank=[...products].filter(x=>x.rating!=null).sort((a,b)=>b.rating-a.rating||Number(b.isOfficialShop)-Number(a.isOfficialShop)||(b.sales||0)-(a.sales||0)).slice(0,30);
  const officialShopRank=[...products].filter(x=>x.isOfficialShop).sort((a,b)=>(b.rating??-1)-(a.rating??-1)||(b.sales||0)-(a.sales||0)).slice(0,30);
  const risingRank=[...products].filter(x=>x.salesGrowth7dPercent!=null).sort((a,b)=>b.salesGrowth7dPercent-a.salesGrowth7dPercent).slice(0,30);
  const scored=[...products].sort((a,b)=>b.score-a.score||(b.sales||0)-(a.sales||0)).slice(0,30);
  const knownSales=products.filter(x=>x.sales!=null),knownRatings=products.filter(x=>x.rating!=null);
  const salesValues=knownSales.map(x=>x.sales).sort((a,b)=>a-b);
  const median=salesValues.length?(salesValues.length%2?salesValues[(salesValues.length-1)/2]:(salesValues[salesValues.length/2-1]+salesValues[salesValues.length/2])/2):null;
  const average=salesValues.length?Number((salesValues.reduce((s,x)=>s+x,0)/salesValues.length).toFixed(1)):null;
  const averageRating=knownRatings.length?Number((knownRatings.reduce((s,x)=>s+x.rating,0)/knownRatings.length).toFixed(2)):null;
  const h=rows(history)[0]||{},aggregate=rows(stats)[0]||{};
  return res.json({ok:true,marketplace:'SHOPEE',generatedAt:new Date().toISOString(),windowDays:30,
   summary:{productsObserved:Number(aggregate.products_observed)||0,productsWithSales:Number(aggregate.products_with_sales)||0,productsWithRating:Number(aggregate.products_with_rating)||0,
    averageSales:num(aggregate.average_sales),medianSales:num(aggregate.median_sales),averageRating:num(aggregate.average_rating),officialShopProducts:Number(aggregate.official_shop_products)||0,snapshots:Number(h.snapshots)||0,
    firstSnapshot:h.first_snapshot||null,lastSnapshot:h.last_snapshot||null,
    productsWithGrowth:products.filter(x=>x.salesGrowth7dPercent!=null).length,
    productsWithReviewCount:0,reviewCountAvailable:false,rankingWeights:{rating:55,sales:30,growth:15}},
   categoryAverages:rows(categories).map(x=>({category:x.category,products:Number(x.products),averageSales:num(x.average_sales),medianSales:num(x.median_sales),averageRating:num(x.average_rating),salesSample:Number(x.sales_sample),ratingSample:Number(x.rating_sample)})),
   rankings:{bestSellers:salesRank,bestRated:ratingRank,officialStores:officialShopRank,rising:risingRank,bestOpportunities:scored},
   limitations:['A Open API fornece vendas e nota, mas não disponibiliza quantidade de avaliações/reviews neste fluxo; reviewCount permanece null.','Média e mediana são calculadas somente sobre produtos observados nos últimos 30 dias, não sobre todo o catálogo Shopee.','Crescimento de 7 dias só aparece quando existe snapshot anterior com pelo menos 7 dias.','Vendas são o contador informado pela Shopee; não representam vendas atribuídas ao Radar nem vendas diárias.','Produtos sem categoria identificada ficam em sem_categoria e não entram em médias específicas de categoria.']});
 }catch(error){
  console.error('shopee intelligence failed',String(error?.message||'ERROR').slice(0,180));
  return res.status(503).json({error:'Não foi possível consolidar a inteligência Shopee.'});
 }
}