const clean=(value,max=240)=>String(value??'').trim().slice(0,max);
function numberOrNull(value){if(value===null||value===undefined||value==='')return null;const n=Number(String(value).replace('%','').replace(',','.'));return Number.isFinite(n)?n:null;}
function cents(value){const n=numberOrNull(value);return n!==null&&n>=0?Math.round(n*100):null;}
async function fallbackId(marketplace,kind,item){
 const source=[marketplace,kind,item?.title||item?.name||'',item?.productUrl||item?.url||'',item?.affiliateUrl||item?.offerLink||''].join('|');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
 return 'hash:'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function persistDiscoveryPage(db,options){
 const {accountId,marketplace,operation,kind,items,cursorIn=null,cursorOut=null,rateLimitRemaining=null}=options;
 const allowed=new Set(['PRODUCT','BRAND','CAMPAIGN','SHOP','CATEGORY','CHANNEL','LINK']);
 if(!allowed.has(kind))throw new Error('Tipo de catálogo inválido.');
 const rows=Array.isArray(items)?items:[],runId=crypto.randomUUID();
 await db.query("INSERT INTO affiliate_discovery_runs(id,account_id,marketplace,operation,status,cursor_in,cursor_out,started_at) VALUES($1,$2,$3,$4,'RUNNING',$5,$6,now())",[runId,accountId,marketplace,clean(operation,80),cursorIn==null?null:String(cursorIn),cursorOut==null?null:String(cursorOut)]);
 let stored=0,skipped=0;
 try{
  const prepared=[];
  for(const item of rows){
   const title=clean(item?.title||item?.name||item?.productName||item?.productTitle||item?.brandName||item?.shopName||item?.offerName||item?.campaignName||item?.categoryName||item?.options?.[0]?.name,300);
   const productUrl=clean(item?.productUrl||item?.originalUrl||item?.productLink||item?.url,2000);
   const affiliateUrl=clean(item?.affiliateUrl||item?.offerLink||item?.promotionLink||item?.shortUrl||item?.url,2000);
   const externalId=clean(item?.externalId||item?.id||item?.itemId||item?.shopId||item?.brandId||item?.campaignId||item?.categoryId||item?.offerId||item?.collectionId,120)||await fallbackId(marketplace,kind,{...item,title,productUrl,affiliateUrl});
   if(!externalId||!title){skipped++;continue;}
   const price=cents(item?.price??item?.currentPrice??item?.priceMin??item?.salePrice??item?.target_sale_price??item?.options?.[0]?.pricing?.[0]?.price);
   const commission=numberOrNull(item?.commissionRate??item?.commission_rate??item?.commissionPercentage);
   const rating=numberOrNull(item?.rating??item?.ratingStar??item?.evaluateRate);
   const sales=numberOrNull(item?.salesCount??item?.sales??item?.salesVolume??item?.lastest_volume);
   const available=typeof item?.available==='boolean'?item.available:typeof item?.isAvailable==='boolean'?item.isAvailable:null;
   prepared.push({external_id:externalId,title,brand_name:clean(item?.brandName||item?.brand||item?.shopName,200),campaign_id:clean(item?.campaignId||item?.collectionId||item?.promotionName,120),product_url:productUrl,affiliate_url:affiliateUrl,image_url:clean(item?.imageUrl||item?.image||item?.thumbnail,2000),price_cents:price,commission_rate:commission,rating,sales_count:sales===null?null:Math.max(0,Math.round(sales)),available,raw_data:item});
  }
  for(let offset=0;offset<prepared.length;offset+=25){
   const chunk=prepared.slice(offset,offset+25);
   await db.query(
    `INSERT INTO affiliate_discovery_items(id,account_id,marketplace,kind,external_id,title,brand_name,campaign_id,product_url,affiliate_url,image_url,price_cents,commission_rate,rating,sales_count,available,raw_data,last_run_id)
     SELECT gen_random_uuid()::text,$2,$3,$4,x.external_id,x.title,x.brand_name,x.campaign_id,x.product_url,x.affiliate_url,x.image_url,x.price_cents,x.commission_rate,x.rating,x.sales_count,x.available,x.raw_data,$5
     FROM jsonb_to_recordset($1::jsonb) AS x(external_id text,title text,brand_name text,campaign_id text,product_url text,affiliate_url text,image_url text,price_cents bigint,commission_rate numeric,rating numeric,sales_count bigint,available boolean,raw_data jsonb)
     ON CONFLICT(account_id,marketplace,kind,external_id) DO UPDATE SET
      title=EXCLUDED.title,brand_name=EXCLUDED.brand_name,campaign_id=EXCLUDED.campaign_id,
      product_url=EXCLUDED.product_url,affiliate_url=EXCLUDED.affiliate_url,image_url=EXCLUDED.image_url,
      price_cents=COALESCE(EXCLUDED.price_cents,affiliate_discovery_items.price_cents),
      commission_rate=COALESCE(EXCLUDED.commission_rate,affiliate_discovery_items.commission_rate),
      rating=COALESCE(EXCLUDED.rating,affiliate_discovery_items.rating),
      sales_count=COALESCE(EXCLUDED.sales_count,affiliate_discovery_items.sales_count),
      available=COALESCE(EXCLUDED.available,affiliate_discovery_items.available),
      raw_data=EXCLUDED.raw_data,last_seen_at=now(),last_run_id=EXCLUDED.last_run_id`,
    [JSON.stringify(chunk),accountId,marketplace,kind,runId]
   );
   if(kind==='PRODUCT'){
    await db.query(
     `INSERT INTO affiliate_discovery_snapshots(id,account_id,marketplace,kind,external_id,sales_count,price_cents,commission_rate,rating,captured_at)
      SELECT gen_random_uuid()::text,$2,$3,$4,x.external_id,x.sales_count,x.price_cents,x.commission_rate,x.rating,now()
      FROM jsonb_to_recordset($1::jsonb) AS x(external_id text,sales_count bigint,price_cents bigint,commission_rate numeric,rating numeric)`,
     [JSON.stringify(chunk.map(x=>({external_id:x.external_id,sales_count:x.sales_count,price_cents:x.price_cents,commission_rate:x.commission_rate,rating:x.rating}))),accountId,marketplace,kind]
    );
   }
   stored+=chunk.length;
  }
  await db.query("UPDATE affiliate_discovery_runs SET status='COMPLETED',pages_completed=1,records_seen=$2,records_upserted=$3,rate_limit_remaining=$4,finished_at=now(),updated_at=now() WHERE id=$1",[runId,rows.length,stored,rateLimitRemaining]);
  return {runId,recordsSeen:rows.length,recordsUpserted:stored,skipped,cursorIn,cursorOut};
 }catch(error){
  await db.query("UPDATE affiliate_discovery_runs SET status='FAILED',pages_completed=1,records_seen=$2,records_upserted=$3,last_error=$4,finished_at=now(),updated_at=now() WHERE id=$1",[runId,rows.length,stored,clean(error?.message||'DISCOVERY_FAILED',240)]);
  throw error;
 }
}