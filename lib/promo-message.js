const clean=(value,max=1200)=>String(value??'').trim().slice(0,max);
const money=cents=>(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const templates={
  IMPACT:{id:'IMPACT',name:'Impactante',headline:'🤯 *OLHA ESSE PREÇO!*',lead:'🔥 Achadinho com preço especial'},
  COMPLETE:{id:'COMPLETE',name:'Oferta completa',headline:'🚨 *CHEGOU PROMOÇÃO!*',lead:'🛍️ Oferta encontrada para você'},
  BABY:{id:'BABY',name:'Bebês e família',headline:'👶 *OFERTA PARA QUEM CUIDA!*',lead:'💗 Um achadinho para a família'},
  IMPORTED:{id:'IMPORTED',name:'Produtos importados',headline:'🌍 *ACHADINHO IMPORTADO!*',lead:'📦 Produto importado em oferta'},
  CLEAN:{id:'CLEAN',name:'Direto e limpo',headline:'✅ *OFERTA DO DIA*',lead:'Confira esta oportunidade'}
};

export const MESSAGE_TEMPLATES=Object.values(templates).map(({id,name})=>({id,name}));

export function resolveTemplate(requested,category='',source=''){
  const id=clean(requested,30).toUpperCase();if(templates[id])return id;
  const context=(clean(category,120)+' '+clean(source,80)).toLowerCase();
  if(/importad|aliexpress|shein|temu/.test(context))return 'IMPORTED';
  if(/beb[eê]|crian|fralda|infantil/.test(context))return 'BABY';
  return 'COMPLETE';
}

export function formatPromo(input={}){
  const title=clean(input.title,220),link=secureUrl(input.affiliateUrl),couponUrl=secureUrl(input.couponUrl),coupon=clean(input.couponCode,100),category=clean(input.category,120),source=clean(input.source,80);
  const current=Number(input.currentPrice||0),original=Number(input.originalPrice||0),discount=original>current&&current>0?Math.round((original-current)*100/original):0;
  if(!title||current<=0||!link)throw new Error('Produto, preço e link de afiliado são obrigatórios.');
  const selected=resolveTemplate(input.template,category,source),preset=templates[selected],rows=[preset.headline,preset.lead,'','💗 '+title];
  if(discount>0)rows.push('🏷️ *'+discount+'% OFF*');
  if(original>current)rows.push('De: ~'+money(original)+'~');
  rows.push('*POR: '+money(current)+'* ✅');
  if(coupon)rows.push('','🏷️ Use o cupom *'+coupon+'*');
  if(couponUrl)rows.push('🎟️ Resgate o cupom aqui:',''+couponUrl);
  rows.push('','🔗 *COMPRE AQUI* 👇',link,'','ℹ️ Link de afiliado. Preço, estoque e condições podem mudar.');
  return {template:selected,templateName:preset.name,message:rows.join('\n'),discountPercent:discount,validated:{title:true,currentPrice:true,originalPrice:original>0,coupon:Boolean(coupon),affiliateUrl:true,couponUrl:Boolean(couponUrl)}};
}

function secureUrl(value){
  const raw=clean(value,1200);if(!raw)return '';
  try{const parsed=new URL(raw);return parsed.protocol==='https:'?parsed.toString():''}catch{return ''}
}
