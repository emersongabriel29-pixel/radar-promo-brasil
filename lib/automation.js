const clean = (v,max=1200) => String(v ?? '').trim().slice(0,max);
const cents = v => Math.round(Number(v || 0) * 100);
const https = v => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };
const money = v => (Number(v||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export async function fingerprint(input){
  const base=[clean(input.source,50).toLowerCase(),clean(input.externalId,200).toLowerCase(),clean(input.productUrl||input.affiliateUrl,1200).replace(/[?#].*$/,'').toLowerCase(),clean(input.title,220).toLowerCase().replace(/\s+/g,' ')].join('|');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(base));
  return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

export function validateOffer(input){
  const title=clean(input.title,220),affiliateUrl=clean(input.affiliateUrl||input.affiliate_url,1200),imageUrl=clean(input.imageUrl||input.image_url,1200),productUrl=clean(input.productUrl||input.product_url,1200),source=clean(input.source,50)||'Outro';
  const currentPrice=cents(input.currentPrice??input.current_price),originalPrice=input.originalPrice||input.original_price?cents(input.originalPrice??input.original_price):null;
  const errors=[];
  if(!title)errors.push('Título ausente');
  if(currentPrice<=0)errors.push('Preço inválido');
  if(!https(imageUrl))errors.push('Imagem HTTPS ausente ou inválida');
  if(!https(affiliateUrl))errors.push('Link de afiliado HTTPS ausente ou inválido');
  if(productUrl&&!https(productUrl))errors.push('Link original inválido');
  return {ok:errors.length===0,errors,value:{title,source,currentPrice,originalPrice,affiliateUrl,imageUrl,productUrl:productUrl||affiliateUrl,couponUrl:clean(input.couponUrl||input.coupon_url,1200),externalId:clean(input.externalId||input.external_id,200)}};
}

export function categoryHint(title){
  const t=clean(title,220).toLowerCase();
  const rules=[
    ['Bebês e crianças',/fralda|beb[eê]|mamadeira|chupeta|brinquedo|infantil|carrinho/],
    ['Tecnologia',/celular|smartphone|iphone|samsung|xiaomi|notebook|computador|tv|fone|headset|game|playstation|xbox|tablet/],
    ['Casa e cozinha',/air ?fryer|panela|cozinha|geladeira|fog[aã]o|micro-ondas|m[oó]vel|cama|mesa|ferramenta|aspirador/],
    ['Moda e beleza',/vestido|camisa|cal[cç]a|t[eê]nis|bolsa|perfume|maquiagem|creme|shampoo|beleza/],
    ['Pet',/pet|cachorro|gato|ra[cç][aã]o|coleira|areia sanit[aá]ria/]
  ];
  return (rules.find(r=>r[1].test(t))||['Ofertas gerais'])[0];
}

export function discount(current,original){return original>current?Math.round((original-current)*100/original):0}
export function offerScore(v){return Math.max(35,Math.min(98,45+discount(v.currentPrice,v.originalPrice)+(/iphone|samsung|air ?fryer|fralda|notebook|tv|perfume/i.test(v.title)?18:8)))}
export function message(v){const rows=['🔥 OFERTA ENCONTRADA!','', '🛍️ '+v.title, v.originalPrice>v.currentPrice?'💰 De '+money(v.originalPrice)+' por '+money(v.currentPrice):'💰 Por '+money(v.currentPrice)];if(v.couponUrl)rows.push('🎟️ Cupom: '+v.couponUrl);rows.push('','🛒 Confira: '+v.affiliateUrl,'⚠️ Preço e estoque podem mudar.');return rows.join('\n')}
