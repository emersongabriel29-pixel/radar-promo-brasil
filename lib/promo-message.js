import { httpsUrl } from './validation.js';

const clean=(value,max=1200)=>String(value??'').replace(/\\s+/g,' ').trim().slice(0,max);
const money=cents=>(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const templates={
  IMPACT:{id:'IMPACT',name:'Impactante',headline:'🤯 *OLHA ESSE PREÇO!*'},
  COMPLETE:{id:'COMPLETE',name:'Oferta completa',headline:'🚨 *OFERTA ESPECIAL!*'},
  BABY:{id:'BABY',name:'Bebês e família',headline:'👶 *OFERTA PARA QUEM CUIDA!*'},
  IMPORTED:{id:'IMPORTED',name:'Produtos importados',headline:'📦 *ACHADINHO IMPORTADO!*'},
  CLEAN:{id:'CLEAN',name:'Direto e limpo',headline:'✅ *OFERTA DO DIA*'}
};

export const MESSAGE_TEMPLATES=Object.values(templates).map(({id,name})=>({id,name}));

export function resolveTemplate(requested,category='',source=''){
  const id=clean(requested,30).toUpperCase();if(templates[id])return id;
  const context=(clean(category,120)+' '+clean(source,80)).toLowerCase();
  if(/importad|aliexpress|shein|temu/.test(context))return 'IMPORTED';
  if(/beb[eê]|crian|fralda|infantil/.test(context))return 'BABY';
  return 'COMPLETE';
}

function compactFallbackTitle(value){
  const raw=clean(value,160);
  if(raw.length<=48)return raw;
  let short=raw.slice(0,48).replace(/\s+\S*$/,'').trim();
  short=short.replace(/\b(com|para|de|da|do|das|dos|e|sem)\b$/i,'').trim();
  return short||raw.slice(0,48).trim();
}

export function formatPromo(input={}){
  const sourceTitle=clean(input.title,160);
  const suppliedTitle=clean(input.shortTitle||input.aiTitle||input.title,160);
  const title=(suppliedTitle===sourceTitle?compactFallbackTitle(suppliedTitle):suppliedTitle.slice(0,70)),link=secureUrl(input.affiliateUrl),couponUrl=secureUrl(input.couponUrl),coupon=clean(input.couponCode,60),category=clean(input.category,120),source=clean(input.source,80);
  const current=Number(input.currentPrice||0),original=Number(input.originalPrice||0),discount=original>current&&current>0?Math.round((original-current)*100/original):0;
  const isFree=input.isFree===true||input.is_free===true||input.offerType==='free'||input.offer_type==='free';
  if(!title||!Number.isSafeInteger(current)||current<0||(current===0&&!isFree)||current>2147483647||!Number.isFinite(original)||original<0||!link)throw new Error('Produto, preço e link de afiliado são obrigatórios; preço zero exige oferta marcada como grátis.');
  const selected=resolveTemplate(input.template,category,source),preset=templates[selected],rows=[preset.headline,'','🛍️ *'+title+'*'];
  if(isFree)rows.push('🎁 *GRÁTIS*');
  if(discount>0)rows.push('🏷️ *'+discount+'% OFF*');
  if(original>current)rows.push('De: ~'+money(original)+'~');
  if(!isFree)rows.push('*POR: '+money(current)+'* ✅');
  if(coupon)rows.push('🎟️ Cupom: *'+coupon+'*');
  const couponSavings=Math.max(0,Math.min(current,Math.round(Number(input.couponSavingsCents)||0)));
  if(coupon&&couponSavings>0)rows.push('💰 *COM CUPOM: '+money(current-couponSavings)+'*');
  if(couponUrl)rows.push('🎟️ Resgate o cupom: '+couponUrl);
  rows.push('','🛒 *COMPRE AQUI* 👇',link,'','ℹ️ Preço, estoque e condições podem mudar.');
  return {template:selected,templateName:preset.name,message:rows.join('\n'),discountPercent:discount,shortTitle:title,validated:{title:true,currentPrice:true,originalPrice:original>0,coupon:Boolean(coupon),affiliateUrl:true,couponUrl:Boolean(couponUrl)}};
}

function secureUrl(value){
  const raw=clean(value,1200);if(!raw)return '';
  return httpsUrl(raw);
}