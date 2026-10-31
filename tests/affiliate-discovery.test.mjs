import test from 'node:test';
import assert from 'node:assert/strict';
import { persistDiscoveryPage } from '../lib/affiliate-discovery.js';

test('discovery page upserts records and records run cursor',async()=>{
 const calls=[];const db={query:async(sql,params)=>{calls.push({sql,params});return {rows:[{id:params[0]}]};}};
 const result=await persistDiscoveryPage(db,{accountId:'a1',marketplace:'SHOPEE',operation:'productOfferV2',kind:'PRODUCT',cursorIn:'1',cursorOut:'2',items:[{itemId:'p1',productName:'Fone',productLink:'https://shopee.com.br/p',offerLink:'https://s.shopee.com.br/x',price:49.9,commissionRate:5,rating:4.8,sales:10,imageUrl:'https://cdn.example.com/p.jpg'}]});
 assert.equal(result.recordsSeen,1);assert.equal(result.recordsUpserted,1);assert.equal(result.cursorOut,'2');
 assert.match(calls[1].sql,/jsonb_to_recordset/);
 assert.match(calls[1].sql,/ON CONFLICT\(account_id,marketplace,kind,external_id\) DO UPDATE/);
 const row=JSON.parse(calls[1].params[0])[0];
 assert.equal(calls[1].params[2],'SHOPEE');assert.equal(calls[1].params[3],'PRODUCT');
 assert.equal(row.title,'Fone');assert.equal(row.price_cents,4990);assert.equal(row.external_id,'p1');
});

test('discovery page skips records without stable title and still records run',async()=>{
 const calls=[];const db={query:async(sql,params)=>{calls.push({sql,params});return {rows:[{id:params[0]}]};}};
 const result=await persistDiscoveryPage(db,{accountId:'a1',marketplace:'LOMADEE',operation:'campaigns',kind:'CAMPAIGN',items:[{id:'c1'}]});
 assert.equal(result.recordsSeen,1);assert.equal(result.recordsUpserted,0);assert.equal(result.skipped,1);
});
