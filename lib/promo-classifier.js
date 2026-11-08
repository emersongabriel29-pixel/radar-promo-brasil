const clean=(value,max=300)=>String(value??'').trim().slice(0,max);
const truthy=value=>value===true||value===1||String(value??'').toLowerCase()==='true';
function metadataOf(value){
  if(!value)return {};
  if(typeof value==='string'){try{return JSON.parse(value)}catch{return {}}}
  return typeof value==='object'&&!Array.isArray(value)?value:{};
}
function collectEvidence(meta){
  const nested=metadataOf(meta.raw_data||meta.rawData||meta.metadata||meta);
  const all={...nested,...meta};
  const campaign=[all.campaignName,all.campaign_name,all.campaignTitle,all.campaign_title,all.promo_name,all.promoName,all.promo_desc,all.promoDesc,all.campaign,all.promotionName,all.promotion_name,all.activityName,all.activity_name].map(x=>clean(x,160)).filter(Boolean).join(' ');
  const type=clean(all.promoType||all.promo_type||all.offerType||all.offer_type||all.activityType||all.activity_type||all.rawType||all.type,80).toLowerCase();
  const status=clean(all.status||all.promoStatus||all.promo_status,40).toLowerCase();
  const inactive=/expired|ended|inactive|disabled|cancelled|canceled|encerrad|expirad|inativ|pausad/.test(status);
  const explicitFlash=!inactive&&(truthy(all.isFlashSale)||truthy(all.is_flash_sale)||truthy(all.flashSale)||truthy(all.flash_sale)||
    /flash.?sale|oferta.?rel[aâ]mpago|rel[aâ]mpago/.test(type)||
    (/flash.?sale|oferta.?rel[aâ]mpago|rel[aâ]mpago/.test(campaign.toLowerCase())&&(!status||/active|ongoing|running|live|ativo|ativa/.test(status))));
  const explicitBlackFriday=!inactive&&(/black\s*friday|black\s*week/.test(campaign.toLowerCase())||
    /black.?friday|black.?week/.test(type));
  return {campaign,type,status,explicitFlash,explicitBlackFriday};
}
export function classifyPromo(input={}){
  const evidence=collectEvidence(metadataOf(input.promoMetadata||input.campaignMetadata||{}));
  const coupon=clean(input.couponCode||input.coupon_code,60);
  const current=Number(input.currentPrice||0),original=Number(input.originalPrice||0);
  const hasDiscount=Number.isFinite(current)&&Number.isFinite(original)&&current>0&&original>current;
  let type='STANDARD',confidence='low',reason='Sem evidência de campanha ou condição promocional específica.';
  if(evidence.explicitBlackFriday){type='BLACK_FRIDAY';confidence='high';reason='Nome ou tipo de campanha contém Black Friday.'}
  else if(evidence.explicitFlash){type='FLASH_SALE';confidence='high';reason='Metadado explícito identifica promoção relâmpago.'}
  else if(coupon){type='COUPON';confidence='high';reason='Código de cupom disponível na oferta.'}
  else if(hasDiscount){type='DISCOUNT';confidence='medium';reason='Preço original e preço atual permitem calcular desconto.'}
  const headlines={
    BLACK_FRIDAY:'🖤 *ESPECIAL BLACK FRIDAY!*',
    FLASH_SALE:'⚡ *OFERTA RELÂMPAGO!*',
    COUPON:'🎟️ *OFERTA COM CUPOM!*',
    DISCOUNT:'🔥 *PREÇO COM DESCONTO!*',
    STANDARD:'🚨 *OFERTA ESPECIAL!*'
  };
  return {type,confidence,reason,campaignName:evidence.campaign||null,headline:headlines[type]};
}