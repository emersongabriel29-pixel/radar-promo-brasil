import { config, db, scheduler } from 'hatchable';
import { fetchWithRetry } from 'lib/http-retry.js';
import { isMedicationProduct } from 'lib/product-safety.js';
import { directImageUrl, httpsUrl } from 'lib/validation.js';
import { formatPromo } from 'lib/promo-message.js';
import { lookupOfficial } from 'lib/extension-marketplace-lookup.js';

export const access = 'scheduler';
export const methods = ['POST'];
const API_URL='https://open-api.affiliate.shopee.com.br/graphql';
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const fromB64=v=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0'));
const norm=s=>clean(s,500).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function itemId(url){
  try{
    const u=new URL(url);
    if(!/(^|\.)shopee\.com\.br$/i.test(u.hostname))return '';
    const m=u.pathname.match(/(?:-i\.|\/product\/)(\d{5,})[./-](\d{5,})/i);
    return m?.[2]||'';
  }catch{return '';}
}
function productPath(url){
  try{const u=new URL(url);if(!/(^|\.)shopee\.com\.br$/i.test(u.hostname))return '';return u.pathname.replace(/\/$/,'').toLowerCase();}catch{return '';}
}
function titleScore(a,b){
  const aa=new Set(norm(a).split(' ').filter(x=>x.length>1));
  const bb=new Set(norm(b).split(' ').filter(x=>x.length>1));
  if(!aa.size||!bb.size)return 0;
  let hit=0;for(const x of aa)if(bb.has(x))hit++;
  return hit/Math.max(aa.size,bb.size);
}
async function decrypt(row){
  let master=String(await config.get('API_CREDENTIALS_MASTER_KEY')||'');
  if(master.length<32)master=String(await config.get('CONNECTOR_ENCRYPTION_KEY')||'');
  if(master.length<32)throw new Error('credential_key_missing');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(master+'|radar-marketplace-credentials|'+row.account_id+'|SHOPEE'));
  const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.nonce)},key,fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function queryShopee(creds,keyword){
  const appId=clean(creds.appId,200),secret=clean(creds.apiSecret,4096);
  if(!appId||!secret)throw new Error('credentials_missing');
  const query='query($keyword:String,$page:Int,$limit:Int){productOfferV2(keyword:$keyword,page:$page,limit:$limit){nodes{itemId shopId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate ratingStar sales} pageInfo{hasNextPage}}}';
  const variables={keyword:clean(keyword,120),page:1,limit:20};
  const body=JSON.stringify({query,variables});
  const timestamp=String(Math.floor(Date.now()/1000));
  const signature=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(appId+timestamp+body+secret))).join('');
  const response=await fetchWithRetry(API_URL,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',authorization:'SHA256 Credential='+appId+', Timestamp='+timestamp+', Signature='+signature},body,signal:AbortSignal.timeout(12000)});
  const raw=await response.text();let data;
  try{data=raw?JSON.parse(raw):{};}catch{throw new Error('invalid_api_response');}
  if(!response.ok||data.errors?.length)throw new Error('shopee_api_'+clean(data.errors?.[0]?.extensions?.code||response.status,60));
  return data.data?.productOfferV2?.nodes||[];
}
export default async function handler(req,res){
  const offerId=clean(req.body?.offerId||req.query?.offerId,100),accountId=clean(req.body?.accountId||req.query?.accountId,100);
  if(!offerId||!accountId)return res.status(400).json({ok:false,error:'offerId e accountId são obrigatórios.'});
  const offer=(await db.query("SELECT * FROM offers WHERE id=$1 AND account_id=$2 AND imported_by IN ('CHROME_EXTENSION','ANDROID_SHARE') AND status='PENDING' LIMIT 1",[offerId,accountId])).rows[0];
  if(!offer)return res.status(404).json({ok:false,error:'Oferta pendente não encontrada.'});
  if(String(offer.source).toUpperCase()!=='SHOPEE'){
    try{
      const result=await lookupOfficial(accountId,offer.source,offer);
      if(!result.supported||!result.matched){
        const reason=result.reason||'OFFICIAL_LOOKUP_UNAVAILABLE';
        await db.query("UPDATE offers SET classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,'Consulta oficial não confirmou o produto: '+reason]);
        return res.json({ok:true,verified:false,status:'REVIEW',reason});
      }
      const title=clean(result.title,220),productUrl=httpsUrl(result.productUrl||offer.product_url,2000);
      const affiliateUrl=httpsUrl(result.affiliateUrl||offer.affiliate_url,2000);
      const imageUrl=directImageUrl(result.image)?result.image:'';
      const current=Number.isSafeInteger(result.priceCents)?result.priceCents:Math.round(Number(result.price)*100);
      const original=result.originalPriceCents==null?(result.originalPrice?Math.round(Number(result.originalPrice)*100):null):result.originalPriceCents;
      if(!title||!productUrl||!affiliateUrl||!imageUrl||!Number.isSafeInteger(current)||current<=0||(original!==null&&(!Number.isSafeInteger(original)||original<current))||result.stock===false||isMedicationProduct({title,productUrl})){
        await db.query("UPDATE offers SET classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,'Dados oficiais incompletos, estoque indisponível ou produto bloqueado.']);
        return res.json({ok:true,verified:false,status:'REVIEW',reason:'OFFICIAL_DATA_INCOMPLETE_OR_BLOCKED'});
      }
      const promo=formatPromo({title,source:offer.source,currentPrice:current,originalPrice:original||0,affiliateUrl,imageUrl,productUrl});
      await db.query("UPDATE offers SET title=$3,current_price=$4,original_price=$5,affiliate_url=$6,image_url=$7,product_url=$8,discount_percent=$9,message=$10,validation_status='PENDING',classification_status='REVIEW',classification_reason=$11,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,title,current,original,affiliateUrl,imageUrl,productUrl,original>current?Math.round((original-current)*100/original):0,promo.message,'Dados atualizados pela API oficial '+String(offer.source)+'; aguardando validações automáticas.']);
      await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,$5,'OFFICIAL_API',$6,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours' AND price=$4 AND original_price IS NOT DISTINCT FROM $5)",[crypto.randomUUID(),accountId,offerId,current,original,result.reference||String(offer.source)]);
      let triggered=false;if(offer.imported_by!=='ANDROID_SHARE'){try{await scheduler.now('/api/jobs/extension-autopublish');triggered=true;}catch(e){console.error('extension autopublish trigger failed',e?.code||e?.name);}}
      return res.json({ok:true,verified:true,status:'OFFICIAL_API_VERIFIED',offerId,marketplace:offer.source,currentPrice:current,triggered});
    }catch(error){
      const code=clean(error?.message||'LOOKUP_FAILED',100);
      await db.query("UPDATE offers SET classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,'Falha na consulta oficial: '+code]);
      console.error('extension product resolve failed',code);
      return res.json({ok:true,verified:false,status:'REVIEW',reason:code});
    }
  }
  try{
    const row=(await db.query("SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='SHOPEE' AND status='VALIDATED' LIMIT 1",[accountId])).rows[0];
    if(!row)throw new Error('shopee_credentials_not_validated');
    const creds=await decrypt(row);
    const nodes=await queryShopee(creds,offer.title);
    const submittedId=itemId(offer.product_url);
    const submittedPath=productPath(offer.product_url);
    const candidates=nodes.map(p=>({p,score:titleScore(offer.title,p.productName),idMatch:!!submittedId&&String(p.itemId)===submittedId,pathMatch:!!submittedPath&&productPath(p.productLink)===submittedPath}));
    const exact=candidates.filter(x=>x.idMatch||x.pathMatch).sort((a,b)=>b.score-a.score)[0];
    const match=exact||(candidates.filter(x=>x.score>=0.94).sort((a,b)=>b.score-a.score)[0]);
    if(!match||(!match.idMatch&&!match.pathMatch&&match.score<0.94)){
      await db.query("UPDATE offers SET classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,'Produto não localizado com correspondência inequívoca na API oficial Shopee.']);
      return res.json({ok:true,verified:false,status:'REVIEW',reason:'NO_EXACT_PRODUCT_MATCH',candidates:nodes.length});
    }
    const p=match.p;
    const title=clean(p.productName,220),productUrl=httpsUrl(p.productLink,2000),affiliateUrl=httpsUrl(p.offerLink,2000);
    const imageUrl=directImageUrl(p.imageUrl)?p.imageUrl:'';
    const current=Math.round(Number(p.priceMin)*100);
    if(!title||!productUrl||!affiliateUrl||!imageUrl||!Number.isSafeInteger(current)||current<=0||isMedicationProduct({title,productUrl})){
      await db.query("UPDATE offers SET classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,'API retornou dados incompletos ou produto bloqueado pelas regras de segurança.']);
      return res.json({ok:true,verified:false,status:'REVIEW',reason:'OFFICIAL_DATA_INCOMPLETE_OR_BLOCKED'});
    }
    const promo=formatPromo({title,source:'SHOPEE',currentPrice:current,originalPrice:0,affiliateUrl,imageUrl,productUrl});
    await db.query("UPDATE offers SET title=$3,current_price=$4,original_price=NULL,affiliate_url=$5,image_url=$6,product_url=$7,discount_percent=0,message=$8,validation_status='PENDING',classification_status='REVIEW',classification_reason=$9,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,title,current,affiliateUrl,imageUrl,productUrl,promo.message,'Preço e dados substituídos pelos retornados pela API oficial Shopee; aguardando regras automáticas.']);
    await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,NULL,'OFFICIAL_API',$5,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours' AND price=$4 AND original_price IS NULL)",[crypto.randomUUID(),accountId,offerId,current,'SHOPEE:'+String(p.itemId)]);
    let triggered=false;
    if(offer.imported_by!=='ANDROID_SHARE'){try{await scheduler.now('/api/jobs/extension-autopublish');triggered=true;}catch(e){console.error('extension autopublish trigger failed',e?.code||e?.name);}}
    return res.json({ok:true,verified:true,status:'OFFICIAL_API_VERIFIED',offerId,itemId:String(p.itemId),currentPrice:current,triggered});
  }catch(error){
    const code=clean(error?.message||'LOOKUP_FAILED',100);
    await db.query("UPDATE offers SET classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2",[offerId,accountId,'Falha na consulta oficial: '+code]);
    console.error('extension product resolve failed',code);
    return res.status(200).json({ok:true,verified:false,status:'REVIEW',reason:code});
  }
}