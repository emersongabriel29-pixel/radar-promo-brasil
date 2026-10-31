import { config, db } from 'hatchable';
import { signTopParams } from 'lib/top-signature.js';
import { createAliExpressAffiliateUrl, signAliExpressParams, validateAliExpressProductUrl } from 'lib/afilimax-aliexpress-provider.js';
import { fingerprint, offerScore } from 'lib/automation.js';
import { classifyProduct } from 'lib/category-classifier.js';
import { isMedicationProduct } from 'lib/product-safety.js';
import { normalizeAliExpressSales, upsertAffiliateSales } from 'lib/affiliate-sales.js';
import { persistDiscoveryPage } from 'lib/affiliate-discovery.js';
// API catalog items are not filtered by product category.
import { formatPromo } from 'lib/promo-message.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

const API_URL = 'https://api-sg.aliexpress.com/sync';
const clean = (v, n=500) => String(v ?? '').trim().slice(0,n);
const fromB64 = v => Uint8Array.from(atob(v), c => c.charCodeAt(0));
const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
async function encryptionKey(accountId, usage) {
  let master=String(await config.get('API_CREDENTIALS_MASTER_KEY')||'');
  if(master.length<32)master=String(await config.get('CONNECTOR_ENCRYPTION_KEY')||'');
  if(master.length<32)throw Object.assign(new Error('Configure API_CREDENTIALS_MASTER_KEY ou CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'),{status:412});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(master+'|radar-marketplace-credentials|'+accountId+'|ALIEXPRESS'));
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,usage);
}
async function sealCredentials(accountId, credentials) {
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const key=await encryptionKey(accountId,['encrypt']);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,new TextEncoder().encode(JSON.stringify(credentials)));
  return {nonce:toB64(nonce),encrypted:toB64(encrypted)};
}
async function accountFor(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];
}
async function credentialsFor(accountId) {
  const row=(await db.query("SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='ALIEXPRESS' LIMIT 1",[accountId])).rows[0];
  if(!row)return null;
  let master=String(await config.get('API_CREDENTIALS_MASTER_KEY')||'');
  if(master.length<32)master=String(await config.get('CONNECTOR_ENCRYPTION_KEY')||'');
  if(master.length<32)throw Object.assign(new Error('Configure API_CREDENTIALS_MASTER_KEY ou CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'),{status:412});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(master+'|radar-marketplace-credentials|'+accountId+'|ALIEXPRESS'));
  const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.nonce)},key,fromB64(row.credentials_enc));
  return {credentials:JSON.parse(new TextDecoder().decode(plain)),status:row.status};
}
function signParams(params, secret) { return signTopParams(params, secret); }
const fields='product_id,product_title,product_main_image_url,product_detail_url,promotion_link,target_sale_price,target_original_price,sale_price,discount,commission_rate,evaluate_rate,lastest_volume,first_level_category_id,second_level_category_id,shop_id,shop_url';
async function topRequest(credentials, method, business={}) {
  const appKey=clean(credentials.appId,200),secret=clean(credentials.apiSecret,4096),tracking=clean(credentials.trackingId,200);
  if(!appKey||!secret||!tracking)throw Object.assign(new Error('Informe App Key, App Secret e Tracking ID emitidos no portal de afiliados.'),{status:412});
  if(credentials.legacyApiAcknowledged!=='true')throw Object.assign(new Error('A API de afiliados documentada pelo AliExpress está marcada como descontinuada. No painel, confirme que entende essa limitação antes de testar as credenciais.'),{status:412});
  const date=new Date(Date.now()+8*60*60*1000);
  const timestamp=date.toISOString().slice(0,19).replace('T',' ');
  const params={
    app_key:appKey,format:'json',method,
    sign_method:'sha256',timestamp,v:'2.0',...business
  };
  if(credentials.appSignature)params.app_signature=clean(credentials.appSignature,300);
  params.sign=await signAliExpressParams(params,secret);
  const body=new URLSearchParams();
  for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&String(v)!=='')body.set(k,String(v));
  const response=await fetch(API_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString(),signal:AbortSignal.timeout(12000)});
  const raw=await response.text();let data;
  try{data=raw?JSON.parse(raw):{};}catch{throw Object.assign(new Error('O gateway AliExpress retornou conteúdo não JSON.'),{status:502});}
  if(!response.ok)throw Object.assign(new Error('O gateway AliExpress respondeu HTTP '+response.status+'.'),{status:502});
  const error=data?.error_response;
  if(error){
    const code=clean(error.code||'API_ERROR',60),subCode=clean(error.sub_code||'',100),message=clean(error.msg||error.message||error.sub_msg||'Sem mensagem adicional do gateway.',300),requestId=clean(error.request_id||error.requestId||'',120);
    const detail=['AliExpress recusou a operação. Código: '+code,subCode?'Subcódigo: '+subCode:'','Detalhe: '+message,requestId?'Request ID: '+requestId:''].filter(Boolean).join(' | ');
    throw Object.assign(new Error(detail),{status:502});
  }
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
  const preferred=['products','product','categories','category','promotion_links','promotion_link','promos','promo','orders','order','hot_products','hot_product','promotions','promotion','items','data'];
  for(const key of preferred){const v=result[key];if(Array.isArray(v))return v;if(v&&typeof v==='object'){const nested=listOf(v,depth+1);if(nested.length)return nested;if(['product','category','promotion_link','order','hot_product','promotion','promo'].includes(key))return [v];}}
  for(const v of Object.values(result)){if(v&&typeof v==='object'){const nested=listOf(v,depth+1);if(nested.length)return nested;}}
  return [];
}
function normalize(items) {
  return items.slice(0,50).map(x=>({
    id:clean(x.product_id||x.productId||x.order_id||x.orderId||x.category_id,100),
    title:clean(x.product_title||x.productTitle||x.title||x.promotion_name||x.promo_name||x.promo_desc||x.category_name||x.order_id,300),
    imageUrl:clean(x.product_main_image_url||x.productMainImageUrl,1500),
    productUrl:clean(x.product_detail_url||x.productDetailUrl||x.source_value,2000),
    affiliateUrl:clean(x.promotion_link||x.promotionLink||x.promotion_link_url,2000),
    price: x.target_sale_price??x.app_sale_price??x.sale_price??x.salePrice??null,
    originalPrice:x.target_original_price??x.original_price??null,
    commissionRate:x.commission_rate??x.commision_rate??x.hot_product_commission_rate??x.commissionRate??null,
    rating:x.evaluate_rate??x.evaluateRate??null,
    salesVolume:x.lastest_volume??x.lastestVolume??null,
    discount: x.discount??null,
    status:clean(x.order_status||x.status,80),
    createdAt:clean(x.created_time||x.createdTime,80),
    grossValue:x.product_price??x.productPrice??null,
    commissionValue:x.commission??null,
    quantity:x.product_count??x.productCount??1,
    subId:clean(x.sub_id||x.subId,120),
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
    const params={fields,keywords:clean(body.keyword,120),page_no:pageNo,country,target_currency:'BRL',target_language:'PT',tracking_id:clean(body.trackingId||c.trackingId,200),device:'PC',device_id:'radar-promo-brasil'};
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
  if(method==='campaigns')return {api:'aliexpress.affiliate.featuredpromo.get',params:{fields:'promo_name,promo_desc,product_num,commission_rate,sale_price'}};
  if(method==='campaignProducts'){
    const promo=clean(body.promotionName,180);
    if(!promo)throw Object.assign(new Error('Informe o nome exato da campanha retornado pelo AliExpress.'),{status:400});
    return {api:'aliexpress.affiliate.featuredpromo.products.get',params:{fields,promotion_name:promo,page_no:pageNo,page_size:page,category_id:clean(body.categoryId,80),country,tracking_id:clean(body.trackingId||c.trackingId,200),target_currency:'BRL',target_language:'PT'}};
  }
  if(method==='generateLink'){
    const safeSource=validateAliExpressProductUrl(body.productUrl);
    if(!safeSource)throw Object.assign(new Error('O link de origem precisa ser HTTPS, sem credenciais embutidas, e pertencer a um domínio oficial AliExpress.'),{status:400});
    return {api:'aliexpress.affiliate.link.generate',params:{promotion_link_type:'0',source_values:safeSource,tracking_id:clean(body.trackingId||c.trackingId,200)}};
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
      mode:'aliexpress_open_platform_sync_sha256',
      capabilities:['product_search','smart_match_recommendations','hot_products','hot_product_download','product_details','categories','featured_campaigns','campaign_products','affiliate_link_generation','batch_affiliate_link_generation','read_only_capability_audit','order_list','order_details','cursor_order_reports'],
      apiDocumentationStatus:saved?.status==='VALIDATED'?'OPEN_PLATFORM_SYNC_SHA256_READ_TEST_CONFIRMED':'NOT_VERIFIED',
      publicationEnabled:false,
      note:saved?.status==='VALIDATED'?'Uma consulta de leitura foi validada anteriormente; isso não confirma todas as permissões avançadas.':'Credenciais ainda não validadas por uma consulta real. A lista de capacidades representa métodos implementados, não permissões garantidas.'
    });
    if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
    if(!saved) return res.status(412).json({error:'Cadastre App Key, App Secret e Tracking ID no painel antes de usar a API.'});
    const c=saved.credentials||{},action=clean(req.body?.action,40);
    if(action==='generateLinkAfilimax'){
      if(c.legacyApiAcknowledged!=='true')return res.status(412).json({error:'Confirme no cadastro que entende que a Affiliate API do AliExpress é legada antes de testar este provider.'});
      const affiliateUrl=await createAliExpressAffiliateUrl({appKey:c.appId,appSecret:c.apiSecret,trackingId:clean(req.body?.trackingId||c.trackingId,200),productUrl:req.body?.productUrl});
      return res.json({ok:true,provider:'@afilimax/aliexpress-provider',providerVersion:'0.1.0',license:'MIT',experimental:true,affiliateUrl,trackingId:clean(req.body?.trackingId||c.trackingId,200),created:true,published:false,publicationEnabled:false,note:'Provider de terceiros adaptado; API não validada com esta conta. Nenhuma oferta foi publicada.'});
    }
    if(action==='credentialDiagnostics'){
      return res.json({provider:'ALIEXPRESS',configured:true,appKeyPresent:Boolean(clean(c.appId,200)),appKeyLast4:clean(c.appId,200).slice(-4),appSecretPresent:Boolean(clean(c.apiSecret,4096)),trackingIdPresent:Boolean(clean(c.trackingId,200)),trackingIdLast4:clean(c.trackingId,200).slice(-4),appSignaturePresent:Boolean(clean(c.appSignature,300)),legacyApiAcknowledged:c.legacyApiAcknowledged==='true',secretsExposed:false,note:'Diagnóstico mascarado; nenhum segredo é retornado.'});
    }

    if(action==='audit'){
      // Explicit, bounded, read-only capability audit. Never return raw order/product data.
      const requested=Array.isArray(req.body?.actions)?req.body.actions.map(x=>clean(x,40)).filter(Boolean):['products','smartMatch','hotProducts','hotProductsDownload','categories','campaigns','campaignProducts','productDetail','orders','orderDetail','ordersByCursor'];
      const allowed=new Set(['products','smartMatch','hotProducts','hotProductsDownload','categories','campaigns','productDetail','campaignProducts','orders','orderDetail','ordersByCursor']);
      const selected=[...new Set(requested)].filter(x=>allowed.has(x)).slice(0,10);
      const now=Date.now();
      const dateText=ms=>new Date(ms).toISOString().slice(0,19).replace('T',' ');
      const report=[];
      let discoveredProductId='',discoveredCampaign='',discoveredOrderId='',discoveredCategoryId='';
      const auditOrder=['categories','products','productDetail','smartMatch','hotProducts','hotProductsDownload','campaigns','campaignProducts','orders','orderDetail','ordersByCursor'];
      selected.sort((a,b)=>auditOrder.indexOf(a)-auditOrder.indexOf(b));
      for(const auditAction of selected){
        try{
          let body={page:1,pageSize:1,keyword:clean(req.body?.keyword||'fone bluetooth',120)};
          if(auditAction==='orders')body={...body,startTime:dateText(now-7*86400000),endTime:dateText(now),orderStatus:'Payment Completed'};
          if(auditAction==='hotProductsDownload'){
            if(!discoveredCategoryId){report.push({action:auditAction,status:'SKIPPED',reason:'Nenhum ID de categoria descoberto na consulta de categorias.'});continue;}
            body.categoryId=discoveredCategoryId;
          }
          if(auditAction==='productDetail'){
            if(!discoveredProductId){report.push({action:auditAction,status:'SKIPPED',reason:'Nenhum ID de produto descoberto nesta auditoria.'});continue;}
            body.productIds=discoveredProductId;
          }
          if(auditAction==='campaignProducts'){
            if(!discoveredCampaign){report.push({action:auditAction,status:'SKIPPED',reason:'Nenhuma campanha descoberta nesta auditoria.'});continue;}
            body.promotionName=discoveredCampaign;
          }
          if(auditAction==='orderDetail'){
            if(!discoveredOrderId){report.push({action:auditAction,status:'SKIPPED',reason:'Nenhum ID de pedido descoberto nesta auditoria.'});continue;}
            body.orderIds=discoveredOrderId;
          }
          if(auditAction==='ordersByCursor'){
            report.push({action:auditAction,status:'SKIPPED',reason:'A API precisa fornecer um cursor válido de consulta anterior.'});continue;
          }
          const spec=build(auditAction,body,c);
          const data=await topRequest(c,spec.api,spec.params);
          const result=unwrap(data,spec.api),items=normalize(listOf(result));
          if(auditAction==='products'&&items[0]?.id)discoveredProductId=items[0].id;
          if(auditAction==='categories'&&items[0]?.id)discoveredCategoryId=items[0].id;
          if(auditAction==='campaigns'&&items[0]?.title)discoveredCampaign=items[0].title;
          if(auditAction==='orders'&&items[0]?.id)discoveredOrderId=items[0].id;
          report.push({action:auditAction,api:spec.api,status:'OK',returnedCount:items.length,hasProductId:items.some(x=>/^\d+$/.test(x.id||'')),hasAffiliateLink:items.some(x=>Boolean(x.affiliateUrl)),hasPrice:items.some(x=>x.price!==null&&x.price!==undefined),hasCommission:items.some(x=>x.commissionRate!==null&&x.commissionRate!==undefined)});
        }catch(error){
          const message=clean(error?.message||'Falha na chamada',300);
          report.push({action:auditAction,status:'ERROR',httpStatus:Number(error?.status)||502,permissionDenied:/InsufficientPermission|insufficient permission|permission/i.test(message),error:message});
        }
      }
      const checked=report.filter(x=>x.status==='OK').length,failed=report.filter(x=>x.status==='ERROR').length,skipped=report.filter(x=>x.status==='SKIPPED').length;
      return res.json({ok:failed===0,complete:failed===0&&skipped===0,action:'audit',readOnly:true,publicationEnabled:false,checks:report,summary:{checked,failed,skipped},note:'Auditoria de chamadas reais e somente leitura. Capacidades implementadas não significam permissões concedidas; revise erros de permissão no portal AliExpress.'});
    }
    if(action==='generateLinksBatch'){
      const urls=Array.isArray(req.body?.productUrls)?req.body.productUrls.slice(0,10):[];
      if(!urls.length)return res.status(400).json({error:'Informe productUrls com 1 a 10 URLs HTTPS do AliExpress.'});
      const results=[];
      for(let index=0;index<urls.length;index++){
        const productUrl=validateAliExpressProductUrl(urls[index]);
        if(!productUrl){results.push({index,status:'ERROR',error:'URL HTTPS oficial do AliExpress inválida.'});continue;}
        try{
          const spec=build('generateLink',{productUrl,trackingId:req.body?.trackingId},c);
          const data=await topRequest(c,spec.api,spec.params);
          const result=unwrap(data,spec.api),items=normalize(listOf(result));
          const raw=result?.promotion_links?.promotion_link;
          const candidate=items.find(x=>x.affiliateUrl)?.affiliateUrl||(Array.isArray(raw)?raw[0]?.promotion_link:raw&&typeof raw==='object'?raw.promotion_link:raw)||result?.promotion_link;
          const link=validateAliExpressProductUrl(candidate);
          if(!link)throw Object.assign(new Error('AliExpress não retornou um link HTTPS reconhecível.'),{status:502});
          results.push({index,status:'OK',productUrl,affiliateUrl:link});
        }catch(error){results.push({index,status:'ERROR',httpStatus:Number(error?.status)||502,error:clean(error?.message||'Falha na geração do link.',250)});}
      }
      return res.json({ok:results.every(x=>x.status==='OK'),action:'generateLinksBatch',total:urls.length,created:results.filter(x=>x.status==='OK').length,failed:results.filter(x=>x.status==='ERROR').length,results,published:false,publicationEnabled:false,note:'Links gerados individualmente com o Tracking ID configurado; nenhuma oferta foi publicada.'});
    }
    if(action==='test'){
      try{
        const spec=build('test',req.body||{},c),data=await topRequest(c,spec.api,spec.params),result=unwrap(data,spec.api),items=normalize(listOf(result));
        await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'",[account.id]);
        return res.json({ok:true,status:'VALIDATED',test:'read_only_product_search',itemsReturned:items.length,apiDocumentationStatus:'OPEN_PLATFORM_SYNC_SHA256_READ_TEST_CONFIRMED',publicationEnabled:false,note:'Consulta de leitura autenticada na Open Platform. Nenhuma oferta foi publicada.'});
      }catch(error){
        await db.query("UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'",[account.id,clean(error?.message||'Falha de validação',220)]);
        throw error;
      }
    }
    const map={products:'products',importOffers:'products',smartMatch:'smartMatch',hotProducts:'hotProducts',hotProductsDownload:'hotProductsDownload',productDetail:'productDetail',categories:'categories',campaigns:'campaigns',campaignProducts:'campaignProducts',generateLink:'generateLink',orders:'orders',syncOrders:'orders',orderDetail:'orderDetail',ordersByCursor:'ordersByCursor'};
    const actionName=map[action];if(!actionName)return res.status(400).json({error:'Operação não suportada.'});
    const orderBody={...(req.body||{})};
    if(action==='syncOrders'){
      if(saved.status!=='VALIDATED')return res.status(412).json({error:'Valide a credencial AliExpress antes de sincronizar pedidos.'});
      const end=new Date(),start=new Date(end.getTime()-7*86400000);
      const fmt=d=>d.toISOString().slice(0,19).replace('T',' ');
      if(!orderBody.startTime&&!orderBody.endTime){orderBody.startTime=fmt(start);orderBody.endTime=fmt(end);}
      const pageSize=Math.min(50,Math.max(1,Math.floor(Number(orderBody.pageSize)||50)));
      const maxPages=Math.min(5,Math.max(1,Math.floor(Number(orderBody.maxPages)||3)));
      let page=Math.min(1000,Math.max(1,Math.floor(Number(orderBody.page)||1))),pagesCompleted=0,received=0;
      const collected=[];
      while(pagesCompleted<maxPages&&page<=1000){
        const pageBody={...orderBody,page,pageSize};
        const pageSpec=build('orders',pageBody,c);
        const pageData=await topRequest(c,pageSpec.api,pageSpec.params);
        const pageItems=normalize(listOf(unwrap(pageData,pageSpec.api)));
        collected.push(...pageItems);received+=pageItems.length;pagesCompleted++;
        if(pageItems.length<pageSize)break;
        page++;
      }
      const ledgerSync=await upsertAffiliateSales(db,account.id,'ALIEXPRESS',normalizeAliExpressSales(collected));
      const hasMore=pagesCompleted===maxPages&&received===pagesCompleted*pageSize&&page<=1000;
      return res.json({ok:true,action:'syncOrders',received,ledgerSync,pagesCompleted,pageSize,startTime:orderBody.startTime,endTime:orderBody.endTime,nextPage:hasMore?page:null,hasMore,readOnlySource:true,publicationEnabled:false,note:'Pedidos lidos em páginas sequenciais e registrados sem duplicação. Nenhuma oferta foi publicada.'});
    }

    const spec=build(actionName,orderBody,c);if(!spec)return res.status(400).json({error:'Parâmetros inválidos.'});
    let data, result, items, fallback=null;
    try {
      data=await topRequest(c,spec.api,spec.params);
      result=unwrap(data,spec.api);
      items=normalize(listOf(result));
    } catch (apiError) {
      const permissionDenied=/InsufficientPermission|insufficient permission|permission/i.test(String(apiError?.message||''));
      const canFallback=['hotProducts','hotProductsDownload','smartMatch','campaignProducts'].includes(action);
      if(!permissionDenied||!canFallback)throw apiError;
      let fallbackSpec;
      if(action==='smartMatch'&&!clean(req.body?.keyword,120)&&/^\d{1,30}$/.test(clean(req.body?.productId,30))){
        fallbackSpec=build('productDetail',{...req.body,productIds:req.body.productId},c);
      } else {
        const fallbackKeyword=clean(req.body?.keyword||(action==='campaignProducts'?req.body?.promotionName:'ofertas'),120);
        fallbackSpec=build('products',{...req.body,keyword:fallbackKeyword,sort:clean(req.body?.sort||'SALE_PRICE_ASC',40)},c);
      }
      data=await topRequest(c,fallbackSpec.api,fallbackSpec.params);
      result=unwrap(data,fallbackSpec.api);
      items=normalize(listOf(result));
      fallback={used:true,requestedAction:action,actualApi:fallbackSpec.api,reason:'A API avançada recusou a operação por falta de permissão; foi usada a busca padrão de produtos. Os itens não são garantidos como produtos em alta nem como correspondência inteligente.',keyword:fallbackSpec.params.keywords||null};
    }
    if(req.body?.persistDiscovery===true||req.body?.persistDiscovery==='true'){
      const pagedActions=new Set(['products','hotProducts','hotProductsDownload','campaignProducts']);
      if(pagedActions.has(action)){
        if(saved.status!=='VALIDATED')return res.status(412).json({error:'Valide a credencial AliExpress antes de persistir o catálogo.'});
        const kind=action==='campaignProducts'?'PRODUCT':'PRODUCT';
        const pageSize=Math.min(50,Math.max(1,Math.floor(Number(orderBody.pageSize)||50)));
        const maxPages=Math.min(5,Math.max(1,Math.floor(Number(orderBody.maxPages)||3)));
        const startPage=Math.min(1000,Math.max(1,Math.floor(Number(orderBody.page)||1)));let page=startPage,pagesCompleted=0,hasMore=false;
        const allItems=[],discoveries=[];
        while(pagesCompleted<maxPages&&page<=1000){
          const pageBody={...orderBody,page,pageSize};
          const pageSpec=build(actionName,pageBody,c);if(!pageSpec)break;
          const pageData=await topRequest(c,pageSpec.api,pageSpec.params);
          const pageItems=normalize(listOf(unwrap(pageData,pageSpec.api)));
          allItems.push(...pageItems);
          discoveries.push(await persistDiscoveryPage(db,{accountId:account.id,marketplace:'ALIEXPRESS',operation:action,kind,items:pageItems,cursorIn:String(page),cursorOut:pageItems.length>=pageSize?String(page+1):null}));
          pagesCompleted++;
          if(pageItems.length<pageSize){hasMore=false;break;}
          page++;hasMore=pagesCompleted===maxPages;
        }
        return res.json({ok:true,action,items:allItems,discovery:discoveries,page:startPage,pagesCompleted,pageSize,nextPage:hasMore?page:null,hasMore,readOnlySource:true,publicationEnabled:false,note:'Catálogo lido em páginas sequenciais e persistido para análise. Nenhuma oferta foi criada ou publicada.'});
      }
    }

    if(req.body?.persistDiscovery===true||req.body?.persistDiscovery==='true'){
      if(saved.status!=='VALIDATED')return res.status(412).json({error:'Valide a credencial AliExpress antes de persistir o catálogo.'});
      const kindMap={products:'PRODUCT',smartMatch:'PRODUCT',hotProducts:'PRODUCT',hotProductsDownload:'PRODUCT',productDetail:'PRODUCT',categories:'CATEGORY',campaigns:'CAMPAIGN',campaignProducts:'PRODUCT'};
      const discoveryKind=kindMap[action];
      if(!discoveryKind)return res.status(400).json({error:'Esta operação não é um recurso de catálogo persistível.'});
      const discoveryItems=action==='campaignProducts'?items.map(item=>({...item,campaignId:clean(req.body?.promotionName,180)})):items;
      const page=Number(orderBody.page)||1,pageSize=Number(orderBody.pageSize)||20;
      const discovery=await persistDiscoveryPage(db,{accountId:account.id,marketplace:'ALIEXPRESS',operation:action,kind:discoveryKind,items:discoveryItems,cursorIn:String(page),cursorOut:['products','smartMatch','hotProducts','hotProductsDownload','campaignProducts'].includes(action)&&items.length>=pageSize?String(page+1):null});
      return res.json({ok:true,action,items,discovery,page,pageSize,readOnlySource:true,publicationEnabled:false,note:'Itens de catálogo persistidos para análise. Nenhuma oferta foi criada ou publicada.'});
    }
    if(action==='importOffers'){
      const minDiscount=Math.max(0,Math.min(90,Number(req.body?.minDiscountPercent??0)||0));
      const minCommission=Math.max(0,Math.min(100,Number(req.body?.minCommissionRate??3)||0));
      const maxRating=Math.max(0,Math.min(100,Number(req.body?.minimumRating??90)||0));
      const cats=(await db.query('SELECT id,name FROM categories WHERE account_id=$1 ORDER BY name',[account.id])).rows;
      const imported=[],skipped=[];
      for(const item of items){
        const title=clean(item.title,220),productUrl=clean(item.productUrl,2000),affiliateUrl=clean(item.affiliateUrl,2000),imageUrl=clean(item.imageUrl,1500);
        const priceNumber=Number(String(item.price??'').replace(',','.')),originalNumber=Number(String(item.originalPrice??'').replace(',','.'));
        const currentPrice=Math.round(priceNumber*100),originalPrice=Math.round(originalNumber*100);
        const commission=Number.parseFloat(String(item.commissionRate??'').replace('%','').replace(',','.'));
        const rating=Number.parseFloat(String(item.rating??'').replace('%','').replace(',','.'));
        const discount=originalPrice>0&&currentPrice>0?Math.round((originalPrice-currentPrice)*100/originalPrice):0;
        let reason='';
        if(isMedicationProduct({title,productUrl}))reason='Medicamentos e produtos farmacêuticos são bloqueados pela política do Radar.';
        else if(!title)reason='Título ausente';
        // No internal category exclusion.
        else if(!/^https:\/\//i.test(productUrl)||!/^https:\/\//i.test(affiliateUrl)||!/^https:\/\//i.test(imageUrl))reason='Produto sem link original, link de afiliado ou imagem HTTPS válida';
        else if(!Number.isSafeInteger(currentPrice)||currentPrice<=0||!Number.isSafeInteger(originalPrice)||originalPrice<=currentPrice)reason='Preço atual/original inválido ou sem desconto verificável';
        else if(discount<minDiscount)reason='Desconto abaixo do mínimo de '+minDiscount+'%';
        else if(!Number.isFinite(commission)||commission<minCommission)reason='Comissão ausente ou abaixo do mínimo de '+minCommission+'%';
        else if(Number.isFinite(rating)&&rating<maxRating)reason='Indicador de avaliação abaixo de '+maxRating+'%';
        if(reason){skipped.push({id:item.id,title,reason});continue;}
        const classification=classifyProduct({title,sourceCategory:item.rawType||''});
        const category=cats.find(c=>c.name.toLowerCase()===String(classification.category||'').toLowerCase())||cats.find(c=>c.name.toLowerCase().includes('gerais'))||null;
        const fp=await fingerprint({source:'ALIEXPRESS',externalId:item.id,productUrl,title});
        const promo=formatPromo({title,source:'ALIEXPRESS',category:classification.category,currentPrice,originalPrice,affiliateUrl,imageUrl,productUrl});
        const score=offerScore({title,currentPrice,originalPrice});
        const saved=await db.query(
          "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,subcategory,classification_tags,classification_confidence,classification_status,classification_reason,source_category) VALUES($1,$2,$3,'ALIEXPRESS',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'PENDING',$12,$13,'VALIDATED','ALIEXPRESS_API',false,$14,$15::jsonb,$16,'REVIEW','Imported as draft; human review required',NULL) ON CONFLICT DO NOTHING RETURNING id",
          [crypto.randomUUID(),account.id,title,originalPrice,currentPrice,category?.id||null,affiliateUrl,imageUrl,productUrl,discount,score,promo.message,fp,classification.subcategory||null,JSON.stringify(classification.tags||[]),classification.confidence||0]
        );
        if(!saved.rows.length){skipped.push({id:item.id,title,reason:'Produto duplicado; não foi importado novamente.'});continue;}
        const offerId=saved.rows[0].id;
        await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())",[crypto.randomUUID(),account.id,offerId,currentPrice,originalPrice,'ALIEXPRESS:'+clean(item.id,120)]);
        imported.push({offerId,productId:item.id,title,price:currentPrice/100,originalPrice:originalPrice/100,discountPercent:discount,commissionRate:item.commissionRate,score,status:'PENDING_REVIEW',priceVerified:true});
      }
      return res.json({ok:true,action:'importOffers',keyword:clean(req.body?.keyword,120),criteria:{minDiscountPercent:minDiscount,minCommissionRate:minCommission,minimumRating:maxRating},imported:imported.length,skipped:skipped.length,items:imported,skippedItems:skipped,readOnlySource:true,reviewRequired:true,autopilotTriggered:false,publicationTriggered:false,publicationEnabled:false,note:'Produtos importados apenas como ofertas pendentes de revisão humana. Nenhuma oferta foi aprovada, publicada ou enviada a grupos.'});
    }
    if(action==='generateLink'){
      const raw=result?.promotion_links?.promotion_link;
      const candidate=items.find(x=>x.affiliateUrl)?.affiliateUrl||(Array.isArray(raw)?raw[0]?.promotion_link:raw&&typeof raw==='object'?raw.promotion_link:raw)||result?.promotion_link;
      const link=validateAliExpressProductUrl(candidate);
      if(!link)throw Object.assign(new Error('AliExpress não retornou um link HTTPS reconhecível de domínio oficial.'),{status:502});
      return res.json({ok:true,affiliateUrl:link,trackingId:clean(req.body?.trackingId||c.trackingId,200),created:true,published:false,note:'Link de afiliado criado pela API; nenhuma oferta foi publicada.'});
    }
    return res.json({ok:true,action,apiMethod:fallback?.actualApi||spec.api,fallback:fallback||{used:false},items,total:items.length,readOnly:true,publicationEnabled:false,apiDocumentationStatus:'OPEN_PLATFORM_SYNC_SHA256'});
  }catch(error){
    const status=Number(error?.status)||502;
    console.error('integrations/aliexpress',JSON.stringify({name:String(error?.name||'Error').slice(0,60),status}));
    return res.status(status>=400&&status<600?status:502).json({error:error?.message||'Não foi possível consultar a API AliExpress.'});
  }
}