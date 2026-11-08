import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PGLITE_DATA_DIR=':memory:';process.env.STANDALONE_SCHEDULER_ENABLED='false';
const {db,getDb}=await import('../hatchable/index.js');
const {getOrCreateAccount}=await import('../lib/accounts.js');
const {ingestOffers,processIngestionBatch}=await import('../lib/ingestion.js');
let a,b;
test.before(async()=>{a=await getOrCreateAccount({id:'ingestion-batch-a'});b=await getOrCreateAccount({id:'ingestion-batch-b'});});test.after(async()=>{await (await getDb()).close();});
const product=i=>({title:'Produto '+i,source:'AMAZON',currentPrice:49.9,originalPrice:49.9,affiliateUrl:'https://example.com/affiliate/'+i,productUrl:'https://example.com/product/'+i,imageUrl:'https://example.com/image.png'});
test('lote com mais de 50 é persistido integralmente, retomado e idempotente',async()=>{
 const body={offers:Array.from({length:57},(_,i)=>product(i))};const first=await ingestOffers(body,'large-event',a.id,{maxItems:20});assert.equal(first.cursor,20);assert.equal(first.total,57);assert.equal(first.pending,true);
 const stored=(await db.query('SELECT jsonb_array_length(payload->\'offers\')::int AS total FROM ingestion_batches WHERE id=$1',[first.batchId])).rows[0];assert.equal(stored.total,57);
 let result=first;while(result.pending)result=await processIngestionBatch(first.batchId,a.id,{maxItems:20});assert.equal(result.complete,true);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM offers WHERE account_id=$1',[a.id])).rows[0].n,57);
 assert.equal((await ingestOffers(body,'large-event',a.id)).inserted,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM offers WHERE account_id=$1',[a.id])).rows[0].n,57);
 await assert.rejects(()=>processIngestionBatch(first.batchId,b.id),e=>e.status===404);
 await assert.rejects(()=>ingestOffers({offers:[product(999)]},'large-event',a.id),e=>e.status===409);
});
test('registro inválido fica preservado no lote para revisão, sem confirmação falsa de oferta',async()=>{
 const result=await ingestOffers({offers:[null,product('valid-review')]},'review-event',b.id);assert.equal(result.complete,true);assert.equal(result.rejected.length,1);
 const row=(await db.query('SELECT state,payload,rejected FROM ingestion_batches WHERE id=$1',[result.batchId])).rows[0];assert.equal(row.state,'COMPLETED_WITH_REVIEW');assert.equal(row.payload.offers.length,2);assert.equal(row.rejected[0].index,0);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM offers WHERE account_id=$1',[b.id])).rows[0].n,1);
});
test('lease impede execução concorrente e expiração permite retomada',async()=>{
 const first=await ingestOffers({offers:[product('lease-0'),product('lease-1')]},'lease-event',b.id,{maxItems:1});
 await db.query("UPDATE ingestion_batches SET state='PROCESSING',lease_token='held',lease_until=now()+interval '1 minute' WHERE id=$1",[first.batchId]);
 const held=await processIngestionBatch(first.batchId,b.id);assert.equal(held.cursor,1);assert.equal(held.inserted,0);
 await db.query("UPDATE ingestion_batches SET lease_until=now()-interval '1 minute' WHERE id=$1",[first.batchId]);assert.equal((await processIngestionBatch(first.batchId,b.id)).complete,true);
});
