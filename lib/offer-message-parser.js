const MAX_TEXT=12000;
const MARKETPLACES=[
{name:'AMAZON',hosts:['amazon.com.br','amzn.to']},
{name:'MERCADO_LIVRE',hosts:['mercadolivre.com.br','mercadolivre.com','meli.la']},
{name:'SHOPEE',hosts:['shopee.com.br','shope.ee','s.shopee.com.br']},
{name:'ALIEXPRESS',hosts:['aliexpress.com','aliexpress.us','ali.ski','s.click.aliexpress.com','a.aliexpress.com']},
{name:'SHEIN',hosts:['shein.com','shein.com.br']},
{name:'MAGALU',hosts:['magazineluiza.com.br','magalu.com']},
{name:'CASAS_BAHIA',hosts:['casasbahia.com.br']},
{name:'KABUM',hosts:['kabum.com.br']},
{name:'AMERICANAS',hosts:['americanas.com.br']}
];
const normalizeHost=h=>String(h||'').toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
function storeFor(host){const h=normalizeHost(host);return MARKETPLACES.find(s=>s.hosts.some(x=>h===x||h.endsWith('.'+x)))?.name||'';}
function safeUrl(raw){try{const u=new URL(String(raw||''));if(u.protocol!=='https:'||u.username||u.password)return null;const store=storeFor(u.hostname);return store?{url:u.toString(),host:normalizeHost(u.hostname),store,params:u.searchParams}:null;}catch{return null;}}
function moneyToCents(raw){const cleaned=String(raw||'').replace(/[^\d.,]/g,'');if(!cleaned)return null;let normalized=cleaned;if(cleaned.includes(','))normalized=cleaned.replace(/\./g,'').replace(',','.');else if((cleaned.match(/\./g)||[]).length>1)normalized=cleaned.replace(/\./g,'');const n=Number(normalized);return Number.isFinite(n)&&n>0&&n<=21474836.47?Math.round(n*100):null;}
function prices(text){
 const matches=[...text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})|\d+(?:\.\d{2})?)/gi)],result=[];
 for(const m of matches){const start=m.index||0,context=text.slice(Math.max(0,start-24),start).toLowerCase(),after=text.slice(start+m[0].length,start+m[0].length+24).toLowerCase();if(/\b(?:off|desconto)\s*$/.test(context)||/^\s*%/.test(after))continue;const cents=moneyToCents(m[1]);if(cents!==null)result.push({cents,index:start,raw:m[0],context});}
 const explicitOriginal=result.find(x=>/\b(?:de|era|antes|original)\s*:?\s*$/.test(x.context));
 const explicitCurrent=result.find(x=>/\b(?:por|agora|hoje|sai por|fica por)\s*:?\s*$/.test(x.context));
 let original=explicitOriginal?.cents??null,current=explicitCurrent?.cents??null;
 if(current===null&&result.length)current=result[result.length-1].cents;
 if(original===null&&result.length>1){const first=result.find(x=>x.cents>(current||0));if(first)original=first.cents;}
 if(original!==null&&current!==null&&original<=current)original=null;
 return {currentPrice:current,originalPrice:original};
}
function affiliateSignal(item){
 if(!item)return false;const h=item.host,p=item.params;
 if(['amzn.to','meli.la','shope.ee','ali.ski','s.click.aliexpress.com','a.aliexpress.com'].includes(h))return true;
 if(item.store==='AMAZON')return [...p.keys()].some(k=>['tag','linkcode','ref_'].some(s=>k.toLowerCase().includes(s)));
 if(item.store==='MERCADO_LIVRE')return ['matt_tool','matt_word','matt_source','tracking_id','wid'].some(k=>p.has(k));
 if(item.store==='ALIEXPRESS')return ['aff_fcid','aff_fsk','aff_platform','aff_trace_key','dp','scm'].some(k=>p.has(k));
 if(item.store==='SHOPEE')return ['af','uls_trackid','utm_campaign','utm_content'].some(k=>p.has(k));
 return [...p.keys()].some(k=>['aff','affiliate','aff_id','affid','sub_id','subid','utm_source'].includes(k.toLowerCase()));
}
export function parseOfferMessage(input, options={}){
 const baseText=String(input??'').slice(0,MAX_TEXT);
 // Telegram text_link entities can carry a URL that is hidden behind clickable text.
 // Append only a bounded list; safeUrl below still allowlists marketplace hosts and HTTPS.
 const entityUrls=Array.isArray(options?.urls)?options.urls.filter(x=>typeof x==='string').slice(0,20).map(x=>x.slice(0,2000)).join('\n'):'';
 const text=(baseText+(entityUrls?'\n'+entityUrls:'')).slice(0,MAX_TEXT).replace(/\r/g,'').trim();if(!text)return {ok:false,reason:'Mensagem vazia.'};
 const urls=[...text.matchAll(/https?:\/\/[^\s<>]+/gi)].map(m=>m[0].replace(/[)\]}>.,!;]+$/,''));
 const links=urls.map(safeUrl).filter(Boolean),lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
 const titleLine=lines.find(line=>!/^https?:\/\//i.test(line)&&!/(?:R\$\s*\d|\b\d+%\s*(?:off|desconto)?\b|cupom|frete grátis|frete gratis|clique aqui|compre aqui|link na bio)/i.test(line)&&line.replace(/[🔥⚡️🚨🛍️🛒💥🎟️💸✅⭐️👉👇*_~]/g,'').trim().length>=4);
 const title=String(titleLine||lines.find(line=>!/^https?:\/\//i.test(line))||'').replace(/[*_~]/g,'').replace(/[🔥⚡️🚨🛍️🛒💥🎟️💸✅⭐️👉👇]/g,'').replace(/\s+/g,' ').trim().slice(0,240);
 const price=prices(text),product=links[0]||null,affiliate=links.find(affiliateSignal)||null;
 const couponCode=(text.match(/(?:cupom|código|codigo)\s*[:：-]?\s*([A-Z0-9_-]{3,24})/i)||[])[1]||'';
 const couponLink=urls.map(safeUrl).find(x=>x&&/cupom|coupon|voucher/i.test(x.url))?.url||'';
 const discountMatch=text.match(/\b(\d{1,2}|100)\s*%\s*(?:OFF|de desconto|desconto)?/i);
 const discountPercent=price.originalPrice&&price.currentPrice&&price.originalPrice>price.currentPrice?Math.round((price.originalPrice-price.currentPrice)*100/price.originalPrice):discountMatch?Number(discountMatch[1]):0;
 const ok=Boolean(title&&price.currentPrice&&product);
 const reason=!title?'Não consegui identificar o nome do produto.':!price.currentPrice?'Não consegui identificar um preço válido.':!product?'Não encontrei link HTTPS de uma loja reconhecida.':!affiliate?'Oferta identificada, mas o link não tem sinais suficientes de rastreamento de afiliado.':'Oferta interpretada.';
 return {ok,reason,title,currentPrice:price.currentPrice,originalPrice:price.originalPrice,discountPercent,productUrl:product?.url||'',affiliateUrl:affiliate?.url||'',marketplace:product?.store||'',affiliateLinkDetected:Boolean(affiliate),couponCode:couponCode.toUpperCase(),couponUrl:couponLink,sourceText:text.slice(0,4000),needsAffiliateLink:ok&&!affiliate,requiresManualReview:true};
}