import { formatPromo } from './promo-message.js';
import { moneyCents, httpsUrl } from './validation.js';
import { categoryHint } from './category-classifier.js';
export { categoryHint };

const clean = (v,max=1200) => String(v ?? '').trim().slice(0,max);
const cents = v => moneyCents(v);
const https = v => Boolean(httpsUrl(v));
const money = v => (Number(v||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export async function fingerprint(input){
  // Duplicate identity is a same-day commercial offer from the same seller,
  // not merely the same catalog product. When seller identity is unavailable, the affiliate/product URL and commercial
  // conditions provide a stable fallback without merging known different sellers.
  const seller=clean(input.sellerId||input.shopId||input.merchantId||input.organizationId||input.sellerName||input.shopName,160).toLowerCase();
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const productRef=seller?clean(input.productUrl||input.affiliateUrl,1200).replace(/[?#].*$/,''):clean(input.affiliateUrl||input.productUrl,1200);\n  const product=clean(input.externalId,200).toLowerCase()||productRef.toLowerCase()||clean(input.title,220).toLowerCase().replace(/\s+/g,' ');
  const conditions={variant:clean(input.variant||input.variation||input.productVariant,240).toLowerCase(),currentPrice:input.currentPrice??input.current_price??null,originalPrice:input.originalPrice??input.original_price??null,couponCode:clean(input.couponCode||input.coupon_code,100).toLowerCase(),couponUrl:clean(input.couponUrl||input.coupon_url,500).toLowerCase(),shipping:clean(input.shipping||input.freight||input.shippingCondition,180).toLowerCase(),condition:clean(input.commercialCondition||input.condition,240).toLowerCase()};
  const base=[clean(input.source,50).toLowerCase(),seller||'seller-unknown',product,JSON.stringify(conditions),day].join('|');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(base));
  return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

export function validateOffer(input){
  input=input&&typeof input==='object'?input:{};
  const title=clean(input.title,220),affiliateUrl=clean(input.affiliateUrl||input.affiliate_url,1200),imageUrl=clean(input.imageUrl||input.image_url,1200),productUrl=clean(input.productUrl||input.product_url,1200),source=clean(input.source,50)||'Outro';
  const currentPrice=cents(input.currentPrice??input.current_price),originalPrice=input.originalPrice||input.original_price?cents(input.originalPrice??input.original_price):null;
  const errors=[];
  const isFree=input.isFree===true||input.is_free===true||input.offerType==='free'||input.offer_type==='free';
  if(!title)errors.push('Título ausente');
  if(!Number.isSafeInteger(currentPrice)||currentPrice<0||(currentPrice===0&&!isFree))errors.push('Preço inválido: preço zero só é permitido para oferta identificada como gratuita');
  if(originalPrice!==null&&(!Number.isSafeInteger(originalPrice)||originalPrice<currentPrice))errors.push('Preço original inválido ou menor que o preço atual');
  const normalizedTitle=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/\b(ganhe dinheiro facil|renda garantida|pix garantido|premio garantido|clique para ganhar|ganhe iphone gratis)\b/.test(normalizedTitle))errors.push('Título contém alegação potencialmente enganosa');
  const titleWords=normalizedTitle.match(/[a-z0-9]{3,}/g)||[];
  if(titleWords.some(word=>titleWords.filter(item=>item===word).length>=3))errors.push('Título repetitivo com sinais de spam');
  if(!https(imageUrl))errors.push('Imagem HTTPS ausente ou inválida');
  if(!https(affiliateUrl))errors.push('Link de afiliado HTTPS ausente ou inválido');
  if(productUrl&&!https(productUrl))errors.push('Link original inválido');
  const couponUrl=clean(input.couponUrl||input.coupon_url,1200);
  if(couponUrl&&!https(couponUrl))errors.push('Link de cupom inválido');
  return {ok:errors.length===0,errors,value:{title,source,currentPrice,originalPrice,isFree,affiliateUrl,imageUrl,productUrl:productUrl||affiliateUrl,couponUrl,couponCode:clean(input.couponCode||input.coupon_code,100),externalId:clean(input.externalId||input.external_id,200)}};
}

export function discount(current,original){return original>current?Math.round((original-current)*100/original):0}
export function offerScore(v){return Math.max(35,Math.min(98,45+discount(v.currentPrice,v.originalPrice)+(/iphone|samsung|air ?fryer|fralda|notebook|tv|perfume/i.test(v.title)?18:8)))}
export function message(v){return formatPromo({...v,currentPrice:v.currentPrice??v.current_price,originalPrice:v.originalPrice??v.original_price,affiliateUrl:v.affiliateUrl??v.affiliate_url,couponUrl:v.couponUrl??v.coupon_url,couponCode:v.couponCode??v.coupon_code,category:categoryHint(v.title,v.source)}).message}