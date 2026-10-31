import { db } from 'hatchable';
export const access='member';
export const methods=['GET','POST'];
const clean=(v,max=240)=>String(v??'').trim().slice(0,max);
const rows=r=>Array.isArray(r?.rows)?r.rows:[];
const n=v=>v==null?null:Math.max(0,Number(v)||0);
async function accountFor(member){return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];}
function lowCompetition(value,kind){
 if(value==null)return null;
 const bands=kind==='creator'?[[0,100],[2,92],[5,82],[10,68],[20,50],[40,30],[80,15],[Infinity,5]]:[[0,100],[3,92],[8,82],[15,68],[30,50],[60,30],[120,15],[Infinity,5]];
 return bands.find(([max])=>value<=max)?.[1]??5;
}
function scoreProduct(x){
 const creators=n(x.creators_found),videos=n(x.videos_found),sales=n(x.sales_count),rating=n(x.rating),commission=n(x.commission_rate);
 const observedAt=x.observed_at?new Date(x.observed_at):null;
 const ageDays=observedAt?Math.max(0,(Date.now()-observedAt.getTime())/86400000):null;
 const freshness=ageDays==null?0:ageDays<=7?1:ageDays<=14?.8:ageDays<=30?.55:0;
 const competition=creators==null?null:lowCompetition(creators,'creator');
 const video=videos==null?null:lowCompetition(videos,'video');
 const demand=sales==null?null:Math.min(100,Math.log10(sales+1)*25);
 const payout=commission==null?null:Math.min(100,commission<=1?commission*1000:commission*10);
 const quality=rating==null?null:Math.max(0,Math.min(100,rating/5*100));
 const discountRaw=n(x.raw_data?.priceDiscountRate??x.raw_data?.discountRate);
 const discountPct=discountRaw==null?null:(discountRaw<=1?discountRaw*100:discountRaw);
 const priceSignal=discountPct==null?null:Math.max(0,Math.min(100,discountPct*4));
 const stock=x.available===false?0:x.available===true?100:null;
 const growthPct=x.prior_sales_count==null||sales==null?null:((sales-Number(x.prior_sales_count))/Math.max(1,Number(x.prior_sales_count)))*100;
 const growth=growthPct==null?null:growthPct>=50?100:growthPct>=20?80:growthPct>=0?60:growthPct>=-20?30:10;
 const parts=[{v:competition,w:.20},{v:video,w:.15},{v:demand,w:.20},{v:payout,w:.15},{v:quality,w:.10},{v:priceSignal,w:.10},{v:stock,w:.05},{v:growth,w:.05}].filter(p=>p.v!=null);
 const knownWeight=parts.reduce((s,p)=>s+p.w,0);
 const base=knownWeight?parts.reduce((s,p)=>s+p.v*p.w,0)/knownWeight:null;
 const score=creators==null||videos==null||sales==null||commission==null||base==null?null:Math.round(base*freshness);
 const confidence=Math.round(Math.min(100,knownWeight/1*100)*(creators==null||videos==null?.55:1)*freshness);
 return {opportunityScore:score,confidence,competitionScore:competition,videoCompetitionScore:video,demandScore:demand==null?null:Math.round(demand),commissionScore:payout==null?null:Math.round(payout),qualityScore:quality==null?null:Math.round(quality),salesGrowthPercent:growthPct==null?null:Number(growthPct.toFixed(1)),growthScore:growth==null?null:growth,observationAgeDays:ageDays==null?null:Number(ageDays.toFixed(1)),observationFreshness:freshness,competitionStatus:creators==null||videos==null?'NOT_OBSERVED':freshness===0?'STALE':freshness<.8?'AGING':'CURRENT'};
}
export default async function handler(req,res){
 if(!req.member)return res.status(401).json({error:'Entre para acessar a análise de concorrência.'});
 const account=await accountFor(req.member);if(!account)return res.status(412).json({error:'Conta Radar ativa não encontrada.'});
 try{
  if(req.method==='GET'){
   const result=await db.query(`SELECT d.external_id,d.title,d.price_cents,d.commission_rate,d.rating,d.sales_count,d.available,d.image_url,d.product_url,d.raw_data,
    o.creators_found,o.videos_found,o.note,o.observed_at,prev.sales_count AS prior_sales_count,prev.captured_at AS prior_sales_at
    FROM affiliate_discovery_items d
    LEFT JOIN LATERAL (SELECT creators_found,videos_found,note,observed_at FROM affiliate_competition_observations x
      WHERE x.account_id=d.account_id AND x.marketplace=d.marketplace AND x.external_id=d.external_id ORDER BY observed_at DESC LIMIT 1)o ON true
    LEFT JOIN LATERAL (SELECT sales_count,captured_at FROM affiliate_discovery_snapshots s WHERE s.account_id=d.account_id AND s.marketplace=d.marketplace AND s.kind=d.kind AND s.external_id=d.external_id AND s.captured_at<=now()-interval '7 days' ORDER BY s.captured_at DESC LIMIT 1)prev ON true
    WHERE d.account_id=$1 AND d.marketplace='SHOPEE' AND d.kind='PRODUCT'
    ORDER BY COALESCE(o.observed_at,d.last_seen_at) DESC LIMIT 150`,[account.id]);
   const products=rows(result).map(x=>({productId:x.external_id,title:x.title,priceCents:n(x.price_cents),commissionRate:n(x.commission_rate),rating:n(x.rating),sales:n(x.sales_count),available:x.available,imageUrl:x.image_url,productUrl:x.product_url,creatorsFound:n(x.creators_found),videosFound:n(x.videos_found),note:x.note||'',observedAt:x.observed_at,...scoreProduct(x)}));
   const history=await db.query("SELECT external_id,product_title,creators_found,videos_found,note,observed_at FROM affiliate_competition_observations WHERE account_id=$1 ORDER BY observed_at DESC LIMIT 50",[account.id]);
   return res.json({ok:true,generatedAt:new Date().toISOString(),products,history:rows(history).map(x=>({productId:x.external_id,title:x.product_title,creatorsFound:x.creators_found,videosFound:x.videos_found,note:x.note,observedAt:x.observed_at})),limitations:['A Open API não informa o total de afiliados nem o total de vídeos de criadores por produto.','Contagens de concorrência são observações manuais da Shopee Vídeos, não totais oficiais.','Observações com mais de 30 dias são consideradas desatualizadas.']});
  }
  if(req.method==='POST'){
   const productId=clean(req.body?.productId,80),title=clean(req.body?.title,240);
   const creators=Number(req.body?.creatorsFound),videos=Number(req.body?.videosFound),note=clean(req.body?.note,500);
   if(!/^[0-9]{1,24}$/.test(productId))return res.status(400).json({error:'Informe o ID numérico do produto Shopee.'});
   if(!title)return res.status(400).json({error:'Informe o nome do produto.'});
   if(!Number.isSafeInteger(creators)||creators<0||creators>1000000||!Number.isSafeInteger(videos)||videos<0||videos>1000000)return res.status(400).json({error:'Informe números inteiros válidos de criadores e vídeos, incluindo zero quando nenhum foi encontrado.'});
   const id=crypto.randomUUID();
   await db.query("INSERT INTO affiliate_competition_observations(id,account_id,marketplace,external_id,product_title,creators_found,videos_found,observation_method,note,observed_at) VALUES($1,$2,'SHOPEE',$3,$4,$5,$6,'MANUAL',$7,now())",[id,account.id,productId,title,creators,videos,note]);
   return res.status(201).json({ok:true,saved:true,id,productId,title,creatorsFound:creators,videosFound:videos,observedAt:new Date().toISOString(),note:'Observação registrada. Ela representa a contagem encontrada na pesquisa manual, não um total oficial da Shopee.'});
  }
  return res.status(405).json({error:'Método não permitido.'});
 }catch(error){console.error('affiliate competition failed',String(error?.message||'ERROR').slice(0,160));return res.status(503).json({error:'Não foi possível consultar ou salvar a análise de concorrência.'});}
}