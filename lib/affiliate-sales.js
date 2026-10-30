const clean=(value,max=160)=>String(value??'').trim().slice(0,max);
function moneyCents(value){
 if(value===null||value===undefined||value==='')return 0;
 if(typeof value==='number')return Number.isFinite(value)&&value>=0?Math.round(value*100):0;
 let raw=String(value).trim().replace(/[^0-9,.-]/g,'');
 if(raw.includes(','))raw=raw.replace(/\./g,'').replace(',','.');
 const n=Number(raw);return Number.isFinite(n)&&n>=0?Math.round(n*100):0;
}
function isoDate(value){
 if(value===null||value===undefined||value==='')return null;
 let d;
 if(typeof value==='number'||/^\d{10,13}$/.test(String(value))){const n=Number(value);d=new Date(n>1e12?n:n*1000);}
 else d=new Date(String(value));
 return Number.isFinite(d.getTime())?d.toISOString():null;
}
function statusOf(value){
 const s=clean(value||'UNKNOWN',48).toUpperCase();
 if(/CANCEL|REFUND|REJECT|INVALID/.test(s))return 'CANCELLED';
 if(/PAID|SETTLED/.test(s))return 'PAID';
 if(/APPROVED|COMPLETED|PAYMENT COMPLETED|CONFIRMED|FINISHED/.test(s))return 'APPROVED';
 return 'PENDING';
}
export function normalizeShopeeSales(nodes){
 const records=[];
 for(const node of Array.isArray(nodes)?nodes:[]){
  const orders=Array.isArray(node?.orders)?node.orders:[];
  if(!orders.length)continue;
  for(const order of orders){
   const items=Array.isArray(order?.items)?order.items:[];
   const grossCents=items.reduce((sum,item)=>sum+moneyCents(item?.itemPrice)*Math.max(0,Number(item?.qty)||0),0);
   let commissionCents=items.reduce((sum,item)=>sum+moneyCents(item?.itemTotalCommission),0);
   if(!commissionCents&&orders.length===1)commissionCents=moneyCents(node?.totalCommission);
   const externalId=clean(order?.orderId,120),orderedAt=isoDate(node?.purchaseTime);
   if(externalId&&orderedAt)records.push({externalId,status:statusOf(order?.orderStatus),orderedAt,grossCents,commissionCents,subid:clean(node?.utmContent,120)});
  }
 }
 return records;
}
export function normalizeAliExpressSales(items){
 return (Array.isArray(items)?items:[]).map(x=>({externalId:clean(x?.id,120),status:statusOf(x?.status),orderedAt:isoDate(x?.createdAt),grossCents:moneyCents(x?.grossValue)*Math.max(1,Number(x?.quantity)||1),commissionCents:moneyCents(x?.commissionValue),subid:clean(x?.subId,120)})).filter(x=>x.externalId&&x.orderedAt);
}
export function normalizeLomadeeSales(items){
 return (Array.isArray(items)?items:[]).map(x=>({externalId:clean(x?.orderId||x?.id,120),status:statusOf(x?.commissionStatus||x?.status),orderedAt:isoDate(x?.createdAt),grossCents:moneyCents(x?.value),commissionCents:moneyCents(x?.commission),subid:clean(x?.mdasc,120)})).filter(x=>x.externalId&&x.orderedAt);
}
export async function upsertAffiliateSales(db,accountId,marketplace,records){
 let stored=0,skipped=0;
 for(const record of Array.isArray(records)?records:[]){
  const externalId=clean(record?.externalId,120),orderedAt=isoDate(record?.orderedAt);
  if(!externalId||!orderedAt){skipped++;continue;}
  const result=await db.query(
   `INSERT INTO affiliate_sales(id,account_id,external_id,marketplace,subid,gross_cents,commission_cents,status,ordered_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(account_id,marketplace,external_id) DO UPDATE SET
      subid=CASE WHEN EXCLUDED.subid<>'' THEN EXCLUDED.subid ELSE affiliate_sales.subid END,
      gross_cents=EXCLUDED.gross_cents,commission_cents=EXCLUDED.commission_cents,
      status=EXCLUDED.status,ordered_at=EXCLUDED.ordered_at,updated_at=now()
    RETURNING id`,
   [crypto.randomUUID(),accountId,externalId,marketplace,clean(record?.subid,120),Math.max(0,Math.round(Number(record?.grossCents)||0)),Math.max(0,Math.round(Number(record?.commissionCents)||0)),statusOf(record?.status),orderedAt]
  );
  if(result.rows?.length)stored++;else skipped++;
 }
 return {received:Array.isArray(records)?records.length:0,stored,skipped,idempotent:true,personalDataStored:false};
}
