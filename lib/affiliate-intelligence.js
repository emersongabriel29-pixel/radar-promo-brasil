const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const positive=v=>Math.max(0,Number(v)||0);
export function scoreAffiliateOpportunity(input={}){
 const radarScore=clamp(input.radarScore,0,100),clicks=positive(input.clicks30d),orders=positive(input.orders30d),commissionCents=positive(input.commissionCents30d);
 const conversionRate=clicks>0?Number((orders/clicks*100).toFixed(2)):null;
 const demandSignal=Math.min(100,Math.log2(clicks+1)*15);
 const conversionSignal=conversionRate===null?0:Math.min(100,conversionRate*10);
 const commissionSignal=Math.min(100,Math.log10(commissionCents+1)*20);
 const score=Math.round(radarScore*.60+demandSignal*.15+conversionSignal*.15+commissionSignal*.10);
 return {score,conversionRate,evidenceLevel:orders>0?'OBSERVED_CONVERSIONS':clicks>0?'OBSERVED_CLICKS':'QUALITY_ONLY',signals:{radarScore:Math.round(radarScore),clicks30d:clicks,orders30d:orders,commissionCents30d:commissionCents,demandSignal:Math.round(demandSignal),conversionSignal:Math.round(conversionSignal),commissionSignal:Math.round(commissionSignal)}};
}
