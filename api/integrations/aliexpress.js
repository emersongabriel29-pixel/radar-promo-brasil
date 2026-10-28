import { config, db } from 'hatchable';
import { signTopParams } from 'lib/top-signature.js';
import { createAliExpressAffiliateUrl } from 'lib/afilimax-aliexpress-provider.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

const API_URL = 'https://eco.taobao.com/router/rest';
const clean = (v, n=500) => String(v ?? '').trim().slice(0,n);
const fromB64 = v => Uint8Array.from(atob(v), c => c.charCodeAt(0));
async function accountFor(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];
}
async function credentialsFor(accountId) {
  const row=(await db.query("SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='ALIEXPRESS' LIMIT 1",[accountId])).rows[0];
  if(!row)return null;
  const master=String(await config.get('CONNECTOR_ENCRYPTION_KEY')||'');
  if(master.length<32)throw Object.assign(new Error('Configure CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'),{status:412});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(master+'|radar-marketplace-credentials|'+accountId+'|ALIEXPRESS'));
  const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.nonce)},key,fromB64(row.credentials_enc));
  return {credentials:JSON.parse(new TextDecoder().decode(plain)),status:row.status};
}
function signParams(params, secret) { return signTopParams(params, secret); }
const fields='product_id,product_title,product_main_image_url,product_detail_url,target_sale_price,target_original_price,sale_price,discount,commission_rate,first_level_category_id,second_level_category_id,shop_id,shop_url';
async function topRequest(credentials, method, business={}) {
  const appKey=clean(credentials.appId,200),secret=clean(credentials.apiSecret,4096),tracking=clean(credentials.trackingId,200);
  if(!appKey||!secret||!tracking)throw Object.assign(new Error('Informe App Key, App Secret e Tracking ID emitidos no portal de afiliados.'),{status:412});
  if(credentials.legacyApiAcknowledged!=='true')throw Object.assign(new Error('A API de afiliados documentada pelo AliExpress está marcada como descontinuada. No painel, confirme que entende essa limitação antes de testar as credenciais.'),{status:412});
  const date=new Date(Date.now()+8*60*60*1000);
  const timestamp=date.toISOString().slice(0,19).replace('T',' ');
  const params={
    app_key:appKey,format:'json',method,
    sign_method:'hmac',timestamp,v:'2.0',...business
  };
  if(credentials.appSignature)params.app_signature=clean(credentials.appSignature,300);
  params.sign=signParams(params,secret);
  const body=new URLSearchParams();
  for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&String(v)!=='')body.set(k,String(v));
  const response=await fetch(API_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString(),signal:AbortSignal.timeout(12000)});
  const raw=await response.text();let data;
  try{data=raw?JSON.parse(raw):{};}catch{throw Object.assign(new Error('O gateway AliExpress retornou conteúdo não JSON.'),{status:502});}
  if(!response.ok)throw Object.assign(new Error('O gateway AliExpress respondeu HTTP '+response.status+'.'),{status:502});
  const error=data?.error_response;
  if(error)throw Object.assign(new Error('AliExpress recusou a operação ('+clean(error.code||error.sub_code||'API_ERROR',60)+'). Confirme se a API Affiliate ainda está habilitada no portal e se as permissões estão ativas.'),{status:502});
  return data;
}
function unwrap(data, method) {
  const root=data?.[method.replaceAll('.','_')+'_response']||Object.values(data||{}).find(v=>v&&typeof v==='object'&&String(Object.keys(v).join(' ')).includes('resp_result'))||data;
  const result=root?.resp_result?.result||root?.resp_result||root;
  return result;
}
function listOf(result, depth=0) {
  if(Array.isArray(result))return result;
  if(!result||typeof result!=='object'||depth>4)return [];
  const preferred=['products','product','categories','category','promotion_links','promotion_link','orders','order','hot_products','hot_product','promotions','promotion','items','data'];
  for(const key of preferred){const v=result[key];if(Array.isArray(v))return v;if(v&&typeof v==='object'){const nested=listOf(v,depth+1);if(nested.length)return nested;if(['product','category','promotion_link','order','hot_product','promotion'].includes(key))return [v];}}
  for(const v of Object.values(result)){if(v&&typeof v==='object'){const nested=listOf(v,depth+1);if(nested.length)return nested;}}
  return [];
}
function normalize(items) {
  return items.slice(0,50).map(x=>({
    id:clean(x.product_id||x.productId||x.order_id||x.orderId||x.category_id,100),
    title:clean(x.product_title||x.productTitle||x.title||x.promotion_name||x.order_id,300),
    imageUrl:clean(x.product_main_image_url||x.productMainImageUrl,1500),
    productUrl:clean(x.product_detail_url||x.productDetailUrl||x.source_value,2000),
    affiliateUrl:clean(x.promotion_link||x.promotionLink||x.promotion_link_url,2000),
    price: x.target_sale_price??x.app_sale_price??x.sale_price??x.salePrice??null,
    originalPrice:x.target_original_price??x.original_price??null,
    commissionRate:x.commission_rate??x.commision_rate??x.hot_product_commission_rate??x.commissionRate??null,
    status:clean(x.order_status||x.status,80),
    createdAt:clean(x.created_time||x.createdTime,80),
    rawType:clean(x.type||x.category_name,100)
  }));
}
function build(method,body,c) {
  const page=Math.min(50,Math.max(1,Math.floor(Number(body.pageSize)||20)));
  const pageNo=Math.min(1000,Math.max(1,Math.floor(Number(body.page)||1)));
  const country=clean(body.country||'BR',2).toUpperCase();
  const common={tracking_id:clean(body.trackingId||c.trackingId,200),target_currency:'BRL',target_language:'PT',ship_to_country:country};
  const dates=()=>{
    const start=clean(body.startTime,19),end=clean(body.endTime,19);
    const valid=s=>/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)&&Number.isFinite(Date.parse(s.replace(' ','T')+'Z'));
    if(!valid(start)||!valid(end)||Date.parse(end.replace(' ','T')+'Z')<Date.parse(start.replace(' ','T')+'Z')||Date.parse(end.replace(' ','T')+'Z')-Date.parse(start.replace(' ','T')+'Z')>90*86400000)throw Object.assign(new Error('Informe startTime/endTime no formato AAAA-MM-DD HH:mm:ss, em um intervalo de até 90 dias.'),{status:400});
    return {start_time:start,end_time:end};
  };
  const orderFields='order_id,product_id,product_title,product_count,product_price,commission_rate,commission,created_time,order_status';
  if(method==='test'||method==='products'){
    const params={fields,keywords:clean(body.keyword||(method==='test'?'cabo usb':''),120),page_no:pageNo,page_size:method==='test'?1:page,sort:clean(body.sort||'SALE_PRICE_ASC',40),...common};
    if(body.categoryIds)params.category_ids=clean(body.categoryIds,200);
    if(body.minPrice)params.min_sale_price=clean(body.minPrice,30);
    if(body.maxPrice)params.max_sale_price=clean(body.maxPrice,30);
    return {api:'aliexpress.affiliate.product.query',params};
  }
  if(method==='smartMatch'){
    const params={fields,keywords:clean(body.keyword,120),page_no:pageNo,country,target_currency:'BRL',target_language:'PT',tracking_id:clean(body.trackingId||c.trackingId,200)};
    const productId=clean(body.productId,30);if(productId&&/^\d{1,30}$/.test(productId))params.product_id=productId;
    if(!params.keywords&&!params.product_id)throw Object.assign(new Error('Informe uma palavra-chave ou um ID de produto para a recomendação inteligente.'),{status:400});
    return {api:'aliexpress.affiliate.product.smartmatch',params};
  }
  if(method==='hotProducts')return {api:'aliexpress.affiliate.hotproduct.query',params:{fields,category_ids:clean(body.categoryIds,200),page_no:pageNo,page_size:page,...common}};
  if(method==='hotProductsDownload')return {api:'aliexpress.affiliate.hotproduct.download',params:{fields,category_id:clean(body.categoryId,80),country,locale_site:clean(body.localeSite||'global',30),page_no:pageNo,page_size:page,target_currency:'BRL',target_language:'PT',tracking_id:clean(body.trackingId||c.trackingId,200)}};
  if(method==='productDetail'){
    const ids=clean(body.productIds,500).split(',').map(x=>x.trim()).filter(x=>/^\d{1,30}$/.test(x)).slice(0,20);
    if(!ids.length)throw Object.assign(new Error('Informe de 1 a 20 IDs numéricos de produtos AliExpress.'),{status:400});
    return {api:'aliexpress.affiliate.productdetail.get',params:{fields,product_ids:ids.join(','),...common}};
  }
  if(method==='categories')return {api:'aliexpress.affiliate.category.get',params:{fields:'category_id,parent_category_id,category_name'}};
  if(method==='campaigns')return {api:'aliexpress.affiliate.featuredpromo.get',params:{fields:'promotion_name,promotion_start_time,promotion_end_time,commission_rate,sale_price'}};
  if(method==='campaignProducts'){
    const promo=clean(body.promotionName,180);
    if(!promo)throw Object.assign(new Error('Informe o nome exato da campanha retornado pelo AliExpress.'),{status:400});
    return {api:'aliexpress.affiliate.featuredpromo.products.get',params:{fields,promotion_name:promo,page_no:pageNo,page_size:page,category_id:clean(body.categoryId,80),country,tracking_id:clean(body.trackingId||c.trackingId,200),target_currency:'BRL',target_language:'PT'}};
  }
  if(method==='generateLink'){
    let source;try{source=new URL(String(body.productUrl||''));}catch{throw Object.assign(new Error('Informe a URL original do produto AliExpress.'),{status:400});}
    const host=source.hostname.toLowerCase();
    if(source.protocol!=='https:'||source.username||source.password||!(host==='aliexpress.com'||host.endsWith('.aliexpress.com')||host==='aliexpress.us'||host.endsWith('.aliexpress.us')))throw Object.assign(new Error('O link de origem precisa ser HTTPS, sem credenciais embutidas, e pertencer a um domínio oficial AliExpress.'),{status:400});
    return {api:'aliexpress.affiliate.link.generate',params:{promotion_link_type:'0',source_values:source.toString(),tracking_id:clean(body.trackingId||c.trackingId,200)}};
  }
  if(method==='orders')return {api:'aliexpress.affiliate.order.list',params:{fields:orderFields,...dates(),page_no:pageNo,page_size:page,locale_site:'global',status:clean(body.orderStatus||'Payment Completed',50)}};
  if(method==='orderDetail'){
    const ids=clean(body.orderIds,500).split(',').map(x=>x.trim()).filter(x=>/^\d{1,40}$/.test(x)).slice(0,20);
    if(!ids.length)throw Object.assign(new Error('Informe de 1 a 20 IDs numéricos de pedidos.'),{status:400});
    return {api:'aliexpress.affiliate.order.get',params:{fields:orderFields,order_ids:ids.join(',')}};
  }
  if(method==='ordersByCursor'){
    const cursor=clean(body.cursor,200);
    if(!cursor)throw Object.assign(new Error('Informe o start_query_index_id retornado pela consulta anterior.'),{status:400});
    return {api:'aliexpress.affiliate.order.listbyindex',params:{fields:orderFields,...dates(),start_query_index_id:cursor,page_size:page,locale_site:'global',status:clean(body.orderStatus||'Payment Completed',50)}};
  }
  return null;
}
export default async function handler(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para acessar a integração AliExpress.'});
  try{
    const account=await accountFor(req.member);
    if(!account)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
    const saved=await credentialsFor(account.id);
    if(req.method==='GET')return res.json({
      provider:'ALIEXPRESS',
      status:saved?.status||'NOT_CONFIGURED',
      mode:'official_TOP_affiliate_legacy_compatibility',
      capabilities:['product_search','smart_match_recommendations','hot_products','hot_product_download','product_details','categories','featured_campaigns','campaign_products','affiliate_link_generation','order_list','order_details','cursor_order_reports'],
      apiDocumentationStatus:'LEGACY_DOCUMENTATION_MARKED_DEPRECATED',
      publicationEnabled:false,
      note:'A documentação pública dos métodos Affiliate API está marcada como descontinuada. A validação real depende de a conta ainda ter acesso e permissões no portal. O Radar não publica ofertas automaticamente.'
    });
    if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
    if(!saved) return res.status(412).json({error:'Cadastre App Key, App Secret e Tracking ID no painel antes de usar a API.'});
    const c=saved.credentials||{},action=clean(req.body?.action,40);
    if(action==='generateLinkAfilimax'){
      if(c.legacyApiAcknowledged!=='true')return res.status(412).json({error:'Confirme no cadastro que entende que a Affiliate API do AliExpress é legada antes de testar este provider.'});
      const affiliateUrl=await createAliExpressAffiliateUrl({appKey:c.appId,appSecret:c.apiSecret,trackingId:clean(req.body?.trackingId||c.trackingId,200),productUrl:req.body?.productUrl});
      return res.json({ok:true,provider:'@afilimax/aliexpress-provider',providerVersion:'0.1.0',license:'MIT',experimental:true,affiliateUrl,trackingId:clean(req.body?.trackingId||c.trackingId,200),created:true,published:false,publicationEnabled:false,note:'Provider de terceiros adaptado; API não validada com esta conta. Nenhuma oferta foi publicada.'});
    }
    if(action==='test'){
      try{
        const spec=build('test',req.body||{},c),data=await topRequest(c,spec.api,spec.params),result=unwrap(data,spec.api),items=normalize(listOf(result));
        await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'",[account.id]);
        return res.json({ok:true,status:'VALIDATED',test:'read_only_product_search',itemsReturned:items.length,apiDocumentationStatus:'LEGACY_DOCUMENTATION_MARKED_DEPRECATED',publicationEnabled:false,note:'A consulta de leitura autenticou. Isso não garante que o AliExpress mantenha a API disponível permanentemente.'});
      }catch(error){
        await db.query("UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'",[account.id,clean(error?.message||'Falha de validação',220)]);
        throw error;
      }
    }
    const map={products:'products',smartMatch:'smartMatch',hotProducts:'hotProducts',hotProductsDownload:'hotProductsDownload',productDetail:'productDetail',categories:'categories',campaigns:'campaigns',campaignProducts:'campaignProducts',generateLink:'generateLink',orders:'orders',orderDetail:'orderDetail',ordersByCursor:'ordersByCursor'};
    const actionName=map[action];if(!actionName)return res.status(400).json({error:'Operação não suportada.'});
    const spec=build(actionName,req.body||{},c);if(!spec)return res.status(400).json({error:'Parâmetros inválidos.'});
    const data=await topRequest(c,spec.api,spec.params),result=unwrap(data,spec.api),items=normalize(listOf(result));
    if(action==='generateLink'){
      const link=items.find(x=>x.affiliateUrl)?.affiliateUrl||clean(result?.promotion_links?.promotion_link||result?.promotion_link,2000);
      if(!link||!/^https:\/\//i.test(link))throw Object.assign(new Error('AliExpress não retornou um link HTTPS de afiliado reconhecível.'),{status:502});
      return res.json({ok:true,affiliateUrl:link,trackingId:clean(req.body?.trackingId||c.trackingId,200),created:true,published:false,note:'Link de afiliado criado pela API; nenhuma oferta foi publicada.'});
    }
    return res.json({ok:true,action,apiMethod:spec.api,items,total:items.length,readOnly:true,publicationEnabled:false,apiDocumentationStatus:'LEGACY_DOCUMENTATION_MARKED_DEPRECATED'});
  }catch(error){
    const status=Number(error?.status)||502;
    const message=String(error?.message||'');
    const providerCode=message.match(/(?:C[oó]digo|code)[: ]+([A-Z0-9_.-]{1,60})/i)?.[1]||null;
    const providerSubCode=message.match(/Subc[oó]digo[: ]+([A-Z0-9_.-]{1,100})/i)?.[1]||null;
    const requestId=message.match(/Request ID[: ]+([A-Z0-9_.:-]{1,120})/i)?.[1]||null;
    const kind=/timeout|timed out|abort/i.test(message)?'timeout':
      /gateway AliExpress respondeu HTTP/i.test(message)?'upstream_http':
      /conte[uú]do n[aã]o JSON/i.test(message)?'upstream_invalid_json':
      /AliExpress recusou/i.test(message)?'provider_rejection':
      /Configure .*segredos do projeto|Informe App Key|descontinuada/i.test(message)?'configuration':
      'request_failure';
    console.error('integrations/aliexpress',JSON.stringify({name:String(error?.name||'Error').slice(0,60),status,kind,providerCode,providerSubCode,requestId}));
    return res.status(status>=400&&status<600?status:502).json({error:error?.message||'Não foi possível consultar a API AliExpress.'});
  }
}