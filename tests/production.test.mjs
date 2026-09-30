import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
process.env.PGLITE_DATA_DIR=':memory:';
process.env.STANDALONE_SCHEDULER_ENABLED='false';
process.env.N8N_WEBHOOK_SECRET='audit-only-master-secret';
const {db,getDb}=await import('../hatchable/index.js');
const {getOrCreateAccount,starter}=await import('../lib/accounts.js');
const {enqueueMatches}=await import('../lib/autopilot.js');
const {claimPublication}=await import('../lib/delivery.js');
const {bindCredential,credentialBelongs}=await import('../lib/credential-bindings.js');
const {moneyCents,httpsUrl,mediaUrl}=await import('../lib/validation.js');
const {safeCreative}=await import('../lib/creative.js');
const {downloadMedia}=await import('../lib/media.js');
const {applyMigrations}=await import('../hatchable/migrations.js');
const {default:dataHandler}=await import('../api/data.js');
const {default:priceHandler}=await import('../api/radar/price.js');
const {default:bridgeHandler}=await import('../api/n8n/bridge.js');
const {default:readinessHandler}=await import('../api/readiness.js');
const member={id:'audit-owner',display_name:'Auditoria'},other={id:'audit-other',display_name:'Outra conta'};
let a,b;
async function invoke(handler,body={},method='POST',who=member,query={}){
  const req={member:who,body,method,query,headers:{},params:{}};
  let status=200,output;const res={status(code){status=code;return this;},json(value){output=value;return this;}};
  await handler(req,res);return {status,body:output};
}
async function signedBridge(body){
  const rawBody=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000));
  const secret=crypto.createHmac('sha256',process.env.N8N_WEBHOOK_SECRET).update(body.accountId).digest('hex');
  const signature=crypto.createHmac('sha256',secret).update(timestamp+'.'+rawBody).digest('hex');
  let status=200,output;await bridgeHandler({body,rawBody,headers:{'x-rpb-timestamp':timestamp,'x-rpb-signature':signature}},{status(code){status=code;return this;},json(value){output=value;return this;}});return {status,body:output};
}
async function offer(account,id,price=4990){await db.query("INSERT INTO offers(id,account_id,title,source,current_price,original_price,affiliate_url,image_url,status,message,score) VALUES($1,$2,$3,'AMAZON',$4,10000,'https://amazon.com.br/dp/EXAMPLE?tag=audit','https://example.com/product.png','APPROVED','Oferta validada',99)",[id,account,'Air fryer '+id,price]);}
test.before(async()=>{await getDb();a=await getOrCreateAccount(member);b=await getOrCreateAccount(other);});
test.after(async()=>{await (await getDb()).close();});

test('criação concorrente mantém uma conta e sete categorias sem recriar exclusões',async()=>{
 const rows=await Promise.all(Array.from({length:6},()=>getOrCreateAccount(member)));assert.ok(rows.every(x=>x.id===a.id));
 await Promise.all(Array.from({length:4},()=>starter(a.id)));assert.equal((await db.query('SELECT count(*)::int n FROM categories WHERE account_id=$1',[a.id])).rows[0].n,7);
 await db.query('DELETE FROM promo_groups WHERE account_id=$1',[a.id]);await starter(a.id);assert.equal((await db.query('SELECT count(*)::int n FROM promo_groups WHERE account_id=$1',[a.id])).rows[0].n,0);
});
test('valores inválidos e URLs internas são rejeitados antes do banco',async()=>{
 assert.equal(moneyCents('R$ 1.299,90'),129990);assert.ok(Number.isNaN(moneyCents('abc')));assert.ok(Number.isNaN(moneyCents('1e100')));
 for(const url of ['https://127.0.0.1/a','https://user:pass@example.com','http://example.com','https://service.internal','https://localhost.','https://service.internal.'])assert.equal(httpsUrl(url),'');
 assert.equal(mediaUrl('/uploads/products/user/test.png'),'/uploads/products/user/test.png');assert.equal(mediaUrl('/uploads/products/../media/test.png'),'');
 const response=await invoke(dataHandler,{entity:'offer',title:'Teste',currentPrice:'abc',affiliateUrl:'https://example.com',imageUrl:'https://example.com/a.png'});assert.equal(response.status,400);
});
test('preço atual sobe sem ser substituído pelo mínimo histórico; mensagem acompanha o preço',async()=>{
 await offer(a.id,'price-audit',7000);
 for(const price of [5000,8000])assert.equal((await invoke(priceHandler,{offerId:'price-audit',price})).status,201);
 const row=(await db.query("SELECT * FROM offers WHERE id='price-audit'")).rows[0];assert.equal(row.current_price,8000);assert.equal(row.price_lowest,5000);assert.equal(row.price_first_seen,7000);assert.equal(row.price_history_count,2);assert.match(row.message,/80,00/);
 assert.equal((await invoke(priceHandler,{offerId:'price-audit',price:2000},'POST',other)).status,404);
});
test('categoria e chaves compostas impedem relacionar registros de outras contas',async()=>{
 await starter(b.id);const category=(await db.query('SELECT id FROM categories WHERE account_id=$1 LIMIT 1',[b.id])).rows[0];
 assert.equal((await invoke(dataHandler,{entity:'offer',title:'Teste',currentPrice:'49.90',affiliateUrl:'https://example.com',imageUrl:'https://example.com/a.png',categoryId:category.id})).status,400);
 await assert.rejects(()=>db.query("INSERT INTO content_assets(id,account_id,offer_id,kind) VALUES('cross-tenant',$1,'price-audit','PROMO_TEXT')",[b.id]),e=>e.code==='23503');
});
test('segredo de bot fica vinculado a uma conta e não pode ser reassociado',async()=>{
 await bindCredential('TELEGRAM',1,a.id);assert.equal(await credentialBelongs('TELEGRAM',1,a.id),true);await assert.rejects(()=>bindCredential('TELEGRAM',1,b.id),e=>e.code==='CREDENTIAL_OWNERSHIP');
});
test('autopilot manual e automático compartilham limite diário e idempotência',async()=>{
 await db.query("INSERT INTO promo_groups(id,account_id,name,platform,external_id,status) VALUES('audit-group',$1,'Destino de teste','TELEGRAM','-123456','ACTIVE')",[a.id]);
 await db.query("UPDATE marketplace_rules SET status='ACTIVE',affiliate_tag='audit-tag' WHERE account_id=$1 AND marketplace='AMAZON'",[a.id]);
 await db.query("INSERT INTO autopilot_rules(id,account_id,name,min_score,min_discount,max_publications_per_day,cooldown_minutes,status) VALUES('audit-rule',$1,'Regra',0,0,2,120,'ACTIVE')",[a.id]);
 await offer(a.id,'auto-1');await offer(a.id,'auto-2');await offer(a.id,'auto-3');
 const results=await Promise.all([enqueueMatches(a.id),enqueueMatches(a.id)]);assert.equal(results.reduce((n,r)=>n+r.queued,0),2);assert.equal((await enqueueMatches(a.id)).queued,0);
 const publications=(await db.query('SELECT id FROM publications WHERE account_id=$1',[a.id])).rows;assert.equal(publications.length,2);
});
test('filas bloqueiam pronto fora da janela e aplicam intervalo por destino',async()=>{
 const publication=(await db.query('SELECT id FROM publications WHERE account_id=$1 LIMIT 1',[a.id])).rows[0];
 await db.query("INSERT INTO queues(id,account_id,name,start_time,end_time,interval_minutes,status) VALUES('audit-queue',$1,'Janela',(((now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 hour')::time)::text,(((now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 hour 1 minute')::time)::text,10,'ACTIVE')",[a.id]);
 assert.equal(await claimPublication(db,publication.id,a.id),undefined);
 await db.query("UPDATE queues SET start_time='00:00',end_time='00:00' WHERE id='audit-queue'");assert.ok(await claimPublication(db,publication.id,a.id));
 const next=(await db.query("SELECT id FROM publications WHERE account_id=$1 AND status='READY' LIMIT 1",[a.id])).rows[0];assert.equal(await claimPublication(db,next.id,a.id),undefined);
 await db.query("UPDATE publications SET status='PUBLISHED',published_at=now(),external_message_id='test-proof' WHERE id=$1",[publication.id]);assert.equal(await claimPublication(db,next.id,a.id),undefined);
});
test('publicação requer oferta aprovada e não aceita confirmação manual falsa',async()=>{
 assert.equal((await invoke(dataHandler,{entity:'publication',id:(await db.query('SELECT id FROM publications LIMIT 1')).rows[0].id,status:'PUBLISHED'},'PUT')).status,412);
 await db.query("UPDATE offers SET status='PENDING' WHERE id='auto-3'");assert.equal((await invoke(dataHandler,{entity:'publication',offerId:'auto-3',groupId:'audit-group'})).status,412);
});
test('webhook repete resposta, recupera falha, atualiza preço e preserva cupom',async()=>{
 const payload={accountId:b.id,eventId:'ingest-1',action:'ingest',offers:[{title:'Celular teste',source:'Amazon',currentPrice:'49.90',originalPrice:'99.90',productUrl:'https://amazon.com.br/dp/AUDIT',affiliateUrl:'https://amazon.com.br/dp/AUDIT?tag=audit',imageUrl:'https://example.com/a.png',couponCode:'REAL10'}]};
 const first=await signedBridge(payload);assert.equal(first.status,200);assert.equal(first.body.inserted,1);
 const repeat=await signedBridge(payload);assert.equal(repeat.body.duplicateEvent,true);assert.equal(repeat.body.inserted,1);
 assert.equal((await db.query('SELECT coupon_code FROM offers WHERE account_id=$1',[b.id])).rows[0].coupon_code,'REAL10');
 const changed=await signedBridge({...payload,eventId:'ingest-2',offers:[{...payload.offers[0],currentPrice:'59.90'}]});assert.equal(changed.status,200);assert.equal((await db.query('SELECT current_price FROM offers WHERE account_id=$1',[b.id])).rows[0].current_price,5990);
 const unknown=await signedBridge({...payload,eventId:'unknown',action:'unknown'});assert.equal(unknown.status,400);assert.equal((await db.query("SELECT id FROM webhook_events WHERE event_key=$1",[b.id+':unknown'])).rows.length,0);
 const failure=await signedBridge({accountId:b.id,eventId:'lead-retry',action:'lead',groupId:'missing',eventType:'JOIN'});assert.equal(failure.status,400);
 await db.query("INSERT INTO promo_groups(id,account_id,name,platform,status) VALUES('lead-target',$1,'Lead','WHATSAPP','PAUSED')",[b.id]);
 assert.equal((await signedBridge({accountId:b.id,eventId:'lead-retry',action:'lead',groupId:'lead-target',eventType:'JOIN'})).status,200);
 assert.equal((await db.query('SELECT count(*)::int n FROM lead_events WHERE account_id=$1',[b.id])).rows[0].n,1);
});
test('readiness não herda saúde de IA de outra conta nem infere entrega do cadastro',async()=>{
 await db.query("INSERT INTO account_integration_health(account_id,name,status,last_checked_at) VALUES($1,'ai','TESTED',now())",[a.id]);const response=await invoke(readinessHandler,{},'GET',other);assert.equal(response.body.external.find(x=>x.key==='ai').ready,false);assert.equal(response.body.core.find(x=>x.key==='deliveryProof').ready,false);assert.equal(response.body.productionReady,false);
});
test('conteúdo criativo rejeita fatos inventados e download respeita limite por stream',async()=>{
 assert.equal(safeCreative('Frete grátis e 80% de desconto por R$ 1,99'),'');assert.equal(safeCreative('Confira os detalhes desta oferta.'),'Confira os detalhes desta oferta.');
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(new Uint8Array(12),{headers:{'content-type':'image/png'}});
 try{await assert.rejects(()=>downloadMedia('https://example.com/a.png',{maxBytes:8}),/limite/);}finally{globalThis.fetch=originalFetch;}
});
test('migração falha atomicamente, registra execução e recusa alteração posterior',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'radar-migrations-')),instance=new PGlite();
 try{
  fs.writeFileSync(path.join(directory,'001.sql'),'CREATE TABLE audit_test(id INTEGER);');await applyMigrations(instance,directory);await applyMigrations(instance,directory);
  fs.writeFileSync(path.join(directory,'002.sql'),'CREATE TABLE rolled_back(id INTEGER); SELECT missing_column FROM audit_test;');await assert.rejects(()=>applyMigrations(instance,directory),/002/);assert.equal((await instance.query("SELECT to_regclass('rolled_back') AS table_name")).rows[0].table_name,null);
  fs.writeFileSync(path.join(directory,'001.sql'),'SELECT 1;');await assert.rejects(()=>applyMigrations(instance,directory),/alterada/);
 }finally{await instance.close();fs.rmSync(directory,{recursive:true,force:true});}
});

test('webhook de entrega exige claim e identificador oficial, sem sobrescrever entrega confirmada',async()=>{
 const publication=(await db.query("SELECT id FROM publications WHERE account_id=$1 AND status='READY' LIMIT 1",[a.id])).rows[0];
 const payload={accountId:a.id,action:'result',publicationId:publication.id,status:'PUBLISHED',externalMessageId:'isolated-test-receipt'};
 assert.equal((await signedBridge({...payload,eventId:'result-no-claim'})).status,409);
 await db.query("UPDATE publications SET status='DISPATCHING' WHERE id=$1",[publication.id]);
 assert.equal((await signedBridge({...payload,eventId:'result-missing-id',externalMessageId:''})).status,400);
 assert.equal((await signedBridge({...payload,eventId:'result-valid'})).status,200);
 assert.equal((await signedBridge({...payload,eventId:'result-valid'})).body.duplicateEvent,true);
 assert.equal((await signedBridge({...payload,eventId:'result-late'})).status,409);
 assert.equal((await db.query('SELECT status,external_message_id FROM publications WHERE id=$1',[publication.id])).rows[0].external_message_id,'isolated-test-receipt');
});
test('IA rejeita referência de outra conta, filtra fatos inventados e registra teste da conta correta',async()=>{
 const {ai}=await import('../hatchable/index.js'),{default:studioHandler}=await import('../api/ai/studio.js');
 const previous=ai.generateText;ai.generateText=async()=>({text:'Frete grátis, cupom INVENTADO e R$ 1,99!',model:'audit-provider',finishReason:'stop'});
 try{
  const input={type:'PROMO_TEXT',model:'gemini',title:'Preço verificado',price:'49.90',link:'https://example.com/a',offerId:'price-audit'};
  assert.equal((await invoke(studioHandler,input,'POST',other)).status,404);
  const response=await invoke(studioHandler,input);assert.equal(response.status,200);assert.doesNotMatch(response.body.content,/INVENTADO|1,99|Frete grátis/);assert.match(response.body.content,/80,00/);
  const health=(await db.query("SELECT last_checked_at FROM account_integration_health WHERE account_id=$1 AND name='ai'",[a.id])).rows[0];assert.ok(health.last_checked_at);
 }finally{ai.generateText=previous;}
});
test('imagens armazenadas renovam URL pelo identificador estável do arquivo',async()=>{
 const {storage}=await import('../hatchable/index.js'),{hydrateImages}=await import('../lib/offer-images.js');
 const previous=storage.url;storage.url=async key=>'https://storage.example.com/'+key+'?signature=renewed';
 try{const result=await hydrateImages([{id:'image',imageUrl:'https://storage.example.com/expired',imageStorageKey:'products/a/image.png'}]);assert.match(result[0].imageUrl,/signature=renewed/);}finally{storage.url=previous;}
});
