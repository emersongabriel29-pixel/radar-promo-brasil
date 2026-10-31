import { config, db } from 'hatchable';
import { meliGet } from 'lib/direct-connectors.js';
import { lomadeeGet, listLomadeeRows, lomadeeProductPrices, normalizeLomadeeProductUrl, getLomadeeActiveLinks } from 'lib/lomadee-api.js';
import { signAliExpressParams } from 'lib/afilimax-aliexpress-provider.js';
import { fetchWithRetry } from 'lib/http-retry.js';

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const fromB64=v=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const https=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'&&!u.username&&!u.password?u.toString():''}catch{return ''}};
const norm=s=>clean(s,500).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function score(a,b){const x=new Set(norm(a).split(' ').filter(v=>v.length>1)),y=new Set(norm(b).split(' ').filter(v=>v.length>1));if(!x.size||!y.size)return 0;let n=0;for(const v of x)if(y.has(v))n++;return n/Math.max(x.size,y.size);}
async function creds(accountId,market){
 const row=(await db.query("SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace=$2 AND status IN ('VALIDATED','READ_ONLY_VALIDATED','LINKS_READ_VALIDATED') LIMIT 1",[accountId,market])).rows[0];
 if(!row)throw new Error(market.toLowerCase()+'_credentials_not_validated');
 let master=String(await config.get('API_CREDENTIALS_MASTER_KEY')||'');if(master.length<32)master=String(await config.get('CONNECTOR_ENCRYPTION_KEY')||'');if(master.length<32)throw new Error('credential_key_missing');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(master+'|radar-marketplace-credentials|'+accountId+'|'+market));
 const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.nonce)},key,fromB64(row.credentials_enc))));
}
function extractId(source,url){
 try{const u=new URL(url);const p=decodeURIComponent(u.pathname);
 if(source==='MERCADO_LIVRE'){return (p.match(/(MLB\d{6,})/i)||p.match(/\/p\/(MLB\d+)/i)||[])[1]?.toUpperCase()||'';}
 if(source==='ALIEXPRESS'){return (p.match(/item\/(\d{5,})\.html/i)||p.match(/(\d{5,})\.html/i)||[])[1]||'';}
 if(source==='AMAZON'){return (p.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)||[])[1]?.toUpperCase()||'';}
 return '';
 }catch{return '';}
}
async function aliRequest(c,method,params){
 const date=new Date(Date.now()+8*60*60*1000);
 const p={app_key:clean(c.appId,200),format:'json',method,sign_method:'sha256',timestamp:date.toISOString().slice(0,19).replace('T',' '),v:'2.0',...params};
 if(!p.app_key||!c.apiSecret||!c.trackingId||c.legacyApiAcknowledged!=='true')throw new Error('aliexpress_credentials_or_api_acknowledgement_missing');
 p.sign=await signAliExpressParams(p,c.apiSecret);
 const body=new URLSearchParams();for(const [k,v] of Object.entries(p))if(v!==undefined&&v!==null&&String(v)!=='')body.set(k,String(v));
 const r=await fetchWithRetry('https://api-sg.aliexpress.com/sync',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString(),signal:AbortSignal.timeout(12000)});
 const raw=await r.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{throw new Error('aliexpress_invalid_json')}
 if(!r.ok||data.error_response)throw new Error('aliexpress_api_'+clean(data.error_response?.code||r.status,60));
 return data;
}
function aliProduct(data,method){
 const root=data?.[method.replaceAll('.','_')+'_response']||Object.values(data||{}).find(v=>v&&typeof v==='object'&&v.resp_result);
 const r=root?.resp_result?.result||root?.resp_result||root||{};
 const find=(v,d=0)=>{if(!v||d>5)return null;if(Array.isArray(v)){for(const x of v){const z=find(x,d+1);if(z)return z;}return null;}if(typeof v!=='object')return null;if(v.product_id||v.product_title)return v;for(const x of Object.values(v)){const z=find(x,d+1);if(z)return z;}return null;};
 return find(r);
}
async function amazonProduct(accountId,asin){
 const c=await creds(accountId,'AMAZON');
 const version=clean(c.version||'3.1',10),endpoint=version==='3.2'?'https://api.amazon.co.uk/auth/o2/token':version==='3.3'?'https://api.amazon.co.jp/auth/o2/token':'https://api.amazon.com/auth/o2/token';
 const tokenRes=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({grant_type:'client_credentials',client_id:c.clientId,client_secret:c.clientSecret,scope:'creatorsapi::default'}),signal:AbortSignal.timeout(12000)});
 const token=await tokenRes.json().catch(()=>({}));if(!tokenRes.ok||!token.access_token)throw new Error('amazon_auth_failed');
 const marketplace=clean(c.marketplace||'www.amazon.com.br',100);
 const response=await fetch('https://creatorsapi.amazon/catalog/v1/getItems',{method:'POST',headers:{authorization:'Bearer '+token.access_token,'content-type':'application/json','x-marketplace':marketplace},body:JSON.stringify({itemIds:[asin],itemIdType:'ASIN',marketplace,partnerTag:c.affiliateId,resources:['images.primary.medium','itemInfo.title','offersV2.listings.price']}),signal:AbortSignal.timeout(15000)});
 const data=await response.json().catch(()=>({}));if(!response.ok||data.errors?.length)throw new Error('amazon_items_lookup_failed');
 const item=data.itemsResult?.items?.[0]||data.items?.[0];if(!item) return null;
 const listing=item.offersV2?.listings?.[0]||{};
 const price=listing.price?.money?.amount??listing.price?.amount??null;
 return {id:asin,title:item.itemInfo?.title?.displayValue||'',price:Number(price),originalPrice:null,image:item.images?.primary?.medium?.url||'',productUrl:item.detailPageURL||'https://www.amazon.com.br/dp/'+asin,affiliateUrl:item.detailPageURL||'',reference:'AMAZON:'+asin};
}
export async function lookupOfficial(accountId,source,offer){
 const src=String(source||'').toUpperCase().replace(/[^A-Z_]/g,'');
 if(src==='MERCADO_LIVRE'||src==='MERCADOLIVRE'){
  const id=extractId('MERCADO_LIVRE',offer.product_url);if(!id)return {supported:true,matched:false,reason:'MERCADO_LIVRE_ITEM_ID_NOT_FOUND'};
  const r=await meliGet(accountId,'/items/'+encodeURIComponent(id));if(r.status<200||r.status>=300)return {supported:true,matched:false,reason:'MELI_ITEM_LOOKUP_FAILED'};
  const p=r.body||{};return {supported:true,matched:true,title:p.title,price:Number(p.price),originalPrice:null,image:p.thumbnail||p.pictures?.[0]?.secure_url||'',productUrl:p.permalink||offer.product_url,affiliateUrl:offer.affiliate_url,reference:'MERCADOLIVRE:'+String(p.id||id),stock:Number(p.available_quantity)>0};
 }
 if(src==='ALIEXPRESS'){
  const id=extractId('ALIEXPRESS',offer.product_url);if(!id)return {supported:true,matched:false,reason:'ALIEXPRESS_PRODUCT_ID_NOT_FOUND'};
  const c=await creds(accountId,'ALIEXPRESS');const method='aliexpress.affiliate.productdetail.get';
  const data=await aliRequest(c,method,{fields:'product_id,product_title,product_main_image_url,product_detail_url,promotion_link,target_sale_price,target_original_price,sale_price',product_ids:id,tracking_id:c.trackingId,target_currency:'BRL',target_language:'PT',ship_to_country:'BR'});
  const p=aliProduct(data,method);if(!p)return {supported:true,matched:false,reason:'ALIEXPRESS_PRODUCT_NOT_FOUND'};
  return {supported:true,matched:true,title:p.product_title,price:Number(p.target_sale_price||p.sale_price),originalPrice:Number(p.target_original_price)||null,image:p.product_main_image_url,productUrl:p.product_detail_url,affiliateUrl:p.promotion_link||offer.affiliate_url,reference:'ALIEXPRESS:'+String(p.product_id||id),stock:true};
 }
 if(src==='AMAZON'){
  const id=extractId('AMAZON',offer.product_url);if(!id)return {supported:true,matched:false,reason:'AMAZON_ASIN_NOT_FOUND'};
  const p=await amazonProduct(accountId,id);if(!p)return {supported:true,matched:false,reason:'AMAZON_ITEM_NOT_FOUND'};
  return {supported:true,matched:true,...p,stock:true};
 }
 if(src==='LOMADEE'){
  const body=await lomadeeGet(accountId,'/affiliate/products',{page:1,limit:50,search:clean(offer.title,100)});
  const rows=listLomadeeRows(body),expected=normalizeLomadeeProductUrl(offer.product_url);
  const match=rows.find(p=>normalizeLomadeeProductUrl(p?.url)===expected&&expected)||rows.find(p=>score(offer.title,p?.name)>=0.96);
  if(!match)return {supported:true,matched:false,reason:'LOMADEE_PRODUCT_NOT_MATCHED'};
  const p=lomadeeProductPrices(match),links=await getLomadeeActiveLinks(accountId);
  if(!links.links.has(String(offer.affiliate_url||'')))return {supported:true,matched:false,reason:'LOMADEE_AFFILIATE_LINK_NOT_CONFIRMED'};
  return {supported:true,matched:p.available,title:p.title,price:p.currentPrice/100,priceCents:p.currentPrice,originalPrice:p.originalPrice? p.originalPrice/100:null,originalPriceCents:p.originalPrice,image:match.image||match.imageUrl||'',productUrl:p.url,affiliateUrl:offer.affiliate_url,reference:'LOMADEE:'+p.id,stock:p.available};
 }
 if(src==='RAKUTEN'){
  const row=(await db.query("SELECT credentials_enc,nonce FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='RAKUTEN' AND status='VALIDATED' LIMIT 1",[accountId])).rows[0];
  if(!row)throw new Error('rakuten_credentials_not_validated');
  let master=String(await config.get('API_CREDENTIALS_MASTER_KEY')||'');if(master.length<32)master=String(await config.get('CONNECTOR_ENCRYPTION_KEY')||'');if(master.length<32)throw new Error('credential_key_missing');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(master+'|radar-marketplace-credentials|'+accountId+'|RAKUTEN'));
  const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);
  const c=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.nonce)},key,fromB64(row.credentials_enc))));
  const token=clean(c.accessToken,4096);if(!token)throw new Error('rakuten_access_token_missing');
  const url=new URL('https://api.linksynergy.com/productsearch/1.0');url.searchParams.set('keyword',clean(offer.title,100));url.searchParams.set('max','50');url.searchParams.set('pagenumber','1');url.searchParams.set('language','pt_BR');
  const response=await fetch(url.toString(),{headers:{authorization:'Bearer '+token,accept:'application/xml'},signal:AbortSignal.timeout(12000)});
  const xml=await response.text();if(!response.ok)throw new Error('rakuten_product_search_http_'+response.status);
  const blocks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  const tag=(block,name)=>{const m=block.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));return m?m[1].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim():'';};
  const products=blocks.map(block=>({id:tag(block,'sku')||tag(block,'linkid'),title:tag(block,'productname'),url:tag(block,'linkurl'),image:tag(block,'imageurl'),price:tag(block,'saleprice')||tag(block,'price'),advertiserId:tag(block,'mid')}));
  const expected=normalizeLomadeeProductUrl(offer.product_url);
  const p=products.find(x=>normalizeLomadeeProductUrl(x.url)===expected&&expected)||products.filter(x=>score(offer.title,x.title)>=0.96).sort((a,b)=>score(offer.title,b.title)-score(offer.title,a.title))[0];
  if(!p)return {supported:true,matched:false,reason:'RAKUTEN_PRODUCT_NOT_MATCHED'};
  const price=Number(String(p.price).replace(',','.'));
  if(!p.title||!Number.isFinite(price)||price<=0||!p.image||!p.url||!p.advertiserId)return {supported:true,matched:false,reason:'RAKUTEN_PRODUCT_DATA_INCOMPLETE'};
  const deep=await fetch('https://api.linksynergy.com/v1/links/deep_links',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({url:p.url,advertiser_id:Number(p.advertiserId),name:'Radar Promo Brasil'}),signal:AbortSignal.timeout(12000)});
  const linkData=await deep.json().catch(()=>({}));const affiliateUrl=linkData?.advertiser?.deep_link?.deep_link_url||'';
  if(!deep.ok||!https(affiliateUrl))return {supported:true,matched:false,reason:'RAKUTEN_DEEP_LINK_NOT_CONFIRMED'};
  return {supported:true,matched:true,title:p.title,price,originalPrice:null,image:p.image,productUrl:p.url,affiliateUrl,reference:'RAKUTEN:'+p.id,stock:true};
 }
 return {supported:false,matched:false,reason:'OFFICIAL_LOOKUP_NOT_AVAILABLE'};
}