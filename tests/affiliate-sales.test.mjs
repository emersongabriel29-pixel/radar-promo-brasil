import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShopeeSales, normalizeAliExpressSales, normalizeLomadeeSales, upsertAffiliateSales } from '../lib/affiliate-sales.js';

test('Shopee conversion rows normalize each order without storing buyer data',()=>{
 const rows=normalizeShopeeSales([{conversionId:'conv-1',purchaseTime:1793337600,totalCommission:3.5,utmContent:'radar-a',orders:[{orderId:'order-1',orderStatus:'COMPLETED',items:[{itemPrice:20,qty:2,itemTotalCommission:3.5}]}]}]);
 assert.equal(rows.length,1);assert.equal(rows[0].externalId,'order-1');assert.equal(rows[0].grossCents,4000);assert.equal(rows[0].commissionCents,350);assert.equal(rows[0].subid,'radar-a');assert.equal(rows[0].status,'APPROVED');assert.equal('buyerName' in rows[0],false);
});

test('AliExpress and Lomadee orders normalize amount, commission and provider status',()=>{
 const ali=normalizeAliExpressSales([{id:'ali-1',status:'Payment Completed',createdAt:'2026-10-29T10:00:00Z',grossValue:15.5,quantity:2,commissionValue:1.25,subId:'track-a'}])[0];
 assert.equal(ali.grossCents,3100);assert.equal(ali.commissionCents,125);assert.equal(ali.externalId,'ali-1');assert.equal(ali.status,'APPROVED');
 const lom=normalizeLomadeeSales([{orderId:'lom-1',status:'PAID',commissionStatus:'APPROVED',createdAt:'2026-10-29T10:00:00Z',value:80,commission:4.8,mdasc:'sub-a'}])[0];
 assert.equal(lom.grossCents,8000);assert.equal(lom.commissionCents,480);assert.equal(lom.status,'APPROVED');
});

test('sales ledger upsert is idempotent and skips records without an order date',async()=>{
 const calls=[];const fakeDb={query:async(sql,params)=>{calls.push({sql,params});return {rows:[{id:params[0]}]};}};
 const result=await upsertAffiliateSales(fakeDb,'account-1','SHOPEE',[{externalId:'order-1',status:'COMPLETED',orderedAt:'2026-10-29T10:00:00Z',grossCents:1000,commissionCents:100},{externalId:'order-2',status:'UNKNOWN',orderedAt:null}]);
 assert.equal(result.stored,1);assert.equal(result.skipped,1);assert.match(calls[0].sql,/ON CONFLICT\(account_id,marketplace,external_id\) DO UPDATE/);assert.equal(calls[0].params[3],'SHOPEE');assert.equal(calls[0].params[7],'APPROVED');
});

test('Shopee conversions without an order object are not recorded as sales',()=>{ assert.deepEqual(normalizeShopeeSales([{conversionId:'click-only',purchaseTime:1793337600,totalCommission:3.5,orders:[]}]),[]); });
