import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.env.PGLITE_DATA_DIR=':memory:';
process.env.STANDALONE_SCHEDULER_ENABLED='false';
process.env.N8N_WEBHOOK_SECRET='operations-test-master';
process.env.CONNECTOR_ENCRYPTION_KEY='operations-only-key-at-least-32-characters';
const {db,getDb,config}=await import('../hatchable/index.js');
const {default:growthHandler}=await import('../api/growth.js');
const {getOrCreateAccount}=await import('../lib/accounts.js');
const {createWhatsappConnection,changeWhatsappConnection,reportWhatsappConnection,claimNextWhatsapp,archiveWhatsappConnection,phoneNumber}=await import('../lib/whatsapp-rotation.js');
const {default:bridge}=await import('../api/n8n/bridge.js');
const {meliGet,seal}=await import('../lib/direct-connectors.js');
const {nextOccurrence,setScheduleStatus,runSchedule}=await import('../lib/recurrences.js');
const {fetchOfferFeed,runMonitors,canActivateMonitor}=await import('../lib/monitoring.js');
const {exportAccountData,verifyPrivacyRequest,resolvePrivacyRequest,runRetention}=await import('../lib/privacy.js');
const {accountSnapshot,createAccountBackup}=await import('../lib/backups.js');
const {verifyBackup}=await import('../scripts/verify-backup.mjs');
const {deliverClaim,Journal,WhatsappAdapter}=await import('../workers/whatsapp.mjs');
const fs=await import('node:fs/promises');
const os=await import('node:os');
const path=await import('node:path');
let a,b,connections;
test.before(async()=>{await getDb();a=await getOrCreateAccount({id:'operation-owner'});b=await getOrCreateAccount({id:'operation-other'});});
test.after(async()=>{await (await getDb()).close();});
async function signed(body){
 const rawBody=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000));
 const key=crypto.createHmac('sha256',process.env.N8N_WEBHOOK_SECRET).update(body.accountId).digest('hex');
 const signature=crypto.createHmac('sha256',key).update(timestamp+'.'+rawBody).digest('hex');
 let status=200,output;await bridge({body,rawBody,headers:{'x-rpb-timestamp':timestamp,'x-rpb-signature':signature}},{status(s){status=s;return this},json(v){output=v;return this}});return {status,body:output};
}
async function publication(id,account=a.id){
 await db.query("INSERT INTO promo_groups(id,account_id,name,platform,external_id,status) VALUES($1,$2,'Teste isolado','WHATSAPP',$3,'ACTIVE') ON CONFLICT DO NOTHING",['group-'+id,account,'audit-group@g.us']);
 await db.query("INSERT INTO offers(id,account_id,title,source,current_price,affiliate_url,image_url,status) VALUES($1,$2,'Produto','AMAZON',4990,'https://amazon.com.br/dp/test?tag=test','https://example.com/test.png','APPROVED') ON CONFLICT DO NOTHING",['offer-'+id,account]);
 await db.query("INSERT INTO publications(id,account_id,offer_id,group_id,status,message,image_url) VALUES($1,$2,$3,$4,'READY','Promoção verificada','https://example.com/test.png')",[id,account,'offer-'+id,'group-'+id]);
}
async function resetDispatch(){await db.query("UPDATE publications SET status='PUBLISHED',published_at=now() WHERE account_id=$1 AND status='DISPATCHING'",[a.id]);await db.query('UPDATE whatsapp_connections SET last_dispatched_at=NULL WHERE account_id=$1',[a.id]);}

test('cinco números por conta mesmo em seis cadastros concorrentes; DDI e duplicatas validados',async()=>{
 assert.equal(phoneNumber('+55 (11) 99999-0001'),'+5511999990001');assert.equal(phoneNumber('11999990001'),'');
 const results=await Promise.allSettled(Array.from({length:6},(_,i)=>createWhatsappConnection(a.id,{name:'Número '+i,phoneNumber:'+551199999000'+i,externalId:'instance-'+i,provider:'N8N'})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,5);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===409).length,1);
 connections=(await db.query('SELECT * FROM whatsapp_connections WHERE account_id=$1 ORDER BY created_at,id',[a.id])).rows;
 await assert.rejects(()=>createWhatsappConnection(a.id,{name:'Duplicado',phoneNumber:connections[0].phone_number,externalId:'extra'}),e=>e.status===409);
 await assert.rejects(()=>changeWhatsappConnection(a.id,{id:connections[0].id,status:'ACTIVE'}),e=>e.status===412);
 for(const c of connections){await reportWhatsappConnection(a.id,{connectionId:c.id,phoneNumber:c.phone_number,status:'CONNECTED',groupMessagingSupported:true,groupIds:['audit-group@g.us']});await changeWhatsappConnection(a.id,{id:c.id,status:'ACTIVE'});}
 await assert.rejects(()=>reportWhatsappConnection(b.id,{connectionId:connections[0].id,phoneNumber:connections[0].phone_number,status:'CONNECTED',groupMessagingSupported:true,groupIds:['audit-group@g.us']}),e=>e.status===404);
});
test('revezamento completa duas voltas sem concentrar no primeiro número',async()=>{
 const picked=[];
 for(let i=0;i<10;i++){await publication('round-'+i);const c=await claimNextWhatsapp('round-'+i,a.id);assert.ok(c);picked.push(c.connectionId);await resetDispatch();}
 assert.equal(new Set(picked.slice(0,5)).size,5);assert.deepEqual(picked.slice(0,5),picked.slice(5));
 assert.equal((await db.query('SELECT whatsapp_dispatch_sequence AS n FROM account_settings WHERE account_id=$1',[a.id])).rows[0].n,10);
});
test('claims concorrentes respeitam intervalo, número ocupado e isolamento entre contas',async()=>{
 for(let i=0;i<8;i++)await publication('parallel-'+i);
 const results=await Promise.all(Array.from({length:8},(_,i)=>claimNextWhatsapp('parallel-'+i,a.id)));
 assert.equal(results.filter(Boolean).length,5);assert.equal(new Set(results.filter(Boolean).map(x=>x.connectionId)).size,5);
 assert.equal(await claimNextWhatsapp('parallel-0',b.id),null);
 await assert.rejects(()=>archiveWhatsappConnection(a.id,results.find(Boolean).connectionId),e=>e.status===409);
 await db.query("UPDATE publications SET status='PUBLISHED',published_at=now() WHERE id LIKE 'parallel-%' AND status='DISPATCHING'");
 assert.equal(await claimNextWhatsapp('parallel-'+results.findIndex(x=>!x),a.id),null);
 await resetDispatch();
});
test('número pausado, sem suporte a grupo ou degradado sai da seleção',async()=>{
 await changeWhatsappConnection(a.id,{id:connections[0].id,status:'PAUSED'});
 await db.query("UPDATE whatsapp_connections SET status='DEGRADED' WHERE id=$1",[connections[1].id]);
 await db.query('UPDATE whatsapp_connections SET group_messaging_supported=false WHERE id=$1',[connections[2].id]);
 await publication('healthy-only');const c=await claimNextWhatsapp('healthy-only',a.id);
 assert.ok(c);assert.ok(!connections.slice(0,3).some(x=>x.id===c.connectionId));await resetDispatch();
 for(const c of connections){await reportWhatsappConnection(a.id,{connectionId:c.id,phoneNumber:c.phone_number,status:'CONNECTED',groupMessagingSupported:true,groupIds:['audit-group@g.us']});await changeWhatsappConnection(a.id,{id:c.id,status:'ACTIVE'});}
});
test('pull repete o mesmo claim, exige token/número e mantém entrega incerta sem reenviar',async()=>{
 await db.query("UPDATE publications SET status='CANCELLED' WHERE account_id=$1 AND status='READY'",[a.id]);
 await publication('leased');const request={accountId:a.id,action:'pull',eventId:'pull-lease',limit:1};
 const first=await signed(request);assert.equal(first.status,200);const item=first.body.items[0];assert.ok(item.dispatchToken);assert.ok(item.connectionPhone);
 const replay=await signed(request);assert.deepEqual(replay.body.items,first.body.items);assert.equal(replay.body.duplicateEvent,true);
 const result={accountId:a.id,action:'result',publicationId:item.id,status:'PUBLISHED',externalMessageId:'receipt',dispatchToken:item.dispatchToken,connectionId:item.connectionId};
 assert.equal((await signed({...result,eventId:'bad-lease',dispatchToken:'old-token'})).status,409);
 assert.equal((await signed({...result,eventId:'wrong-number',connectionId:'different'})).status,409);
 assert.equal((await signed({...result,eventId:'unknown-result',status:'UNKNOWN'})).status,200);
 assert.equal((await signed({...request,eventId:'pull-after-unknown'})).body.items.length,0);
 assert.equal((await signed({...result,eventId:'reconcile'})).status,200);
 assert.equal((await signed({...result,eventId:'late-receipt'})).status,409);
});
test('Mercado Livre mantém corpo da resposta autenticada e rejeita caminho externo',async()=>{
 await db.query("INSERT INTO marketplace_connections(id,account_id,marketplace,access_token_enc,refresh_token_enc,expires_at,status) VALUES('meli-test',$1,'MERCADOLIVRE',$2,$3,now()+interval '1 hour','ACTIVE')",[a.id,await seal('test-access'),await seal('test-refresh')]);
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({results:[{id:'MLB123',title:'Produto',price:49.9}]}),{status:200,headers:{'Content-Type':'application/json'}});
 try{const result=await meliGet(a.id,'/sites/MLB/search',{q:'teste'});assert.equal(result.body.results[0].id,'MLB123');await assert.rejects(()=>meliGet(a.id,'/../external'));}finally{globalThis.fetch=previous;}
});
test('revezamento não escolhe número sem acesso ao grupo, com validação vencida ou quando pausado',async()=>{
 await publication('specific-group');
 await db.query('UPDATE whatsapp_connections SET verified_groups=$2 WHERE account_id=$1',[a.id,JSON.stringify(['different-group@g.us'])]);
 assert.equal(await claimNextWhatsapp('specific-group',a.id),null);
 await db.query("UPDATE whatsapp_connections SET verified_groups=$2,last_verified_at=now()-interval '25 hours' WHERE account_id=$1",[a.id,JSON.stringify(['audit-group@g.us'])]);
 assert.equal(await claimNextWhatsapp('specific-group',a.id),null);
 for(const c of connections)await reportWhatsappConnection(a.id,{connectionId:c.id,phoneNumber:c.phone_number,status:'CONNECTED',groupMessagingSupported:true,groupIds:['audit-group@g.us']});
 await db.query("UPDATE publications SET status='CANCELLED' WHERE id='specific-group'");
});
test('recorrências respeitam fuso, dias úteis, dia semanal, data única e horário inexistente em DST',()=>{
 assert.equal(nextOccurrence({recurrence:'DAILY',send_time:'09:00'},new Date('2026-10-01T11:00:00Z')).toISOString(),'2026-10-01T12:00:00.000Z');
 assert.equal(nextOccurrence({recurrence:'WEEKDAYS',send_time:'09:00'},new Date('2026-10-02T13:00:00Z')).toISOString(),'2026-10-05T12:00:00.000Z');
 assert.equal(nextOccurrence({recurrence:'WEEKLY',weekday:0,send_time:'09:00'},new Date('2026-10-02T13:00:00Z')).toISOString(),'2026-10-04T12:00:00.000Z');
 assert.equal(nextOccurrence({recurrence:'ONCE',once_date:'2026-10-01',send_time:'09:00'},new Date('2026-10-02T13:00:00Z')),null);
 assert.equal(nextOccurrence({recurrence:'DAILY',send_time:'02:30'},new Date('2026-03-08T05:00:00Z'),'America/New_York').toISOString(),'2026-03-09T06:30:00.000Z');
});
test('recorrência concorrente cria apenas uma mensagem, ignora tarefa antiga e pausa sem envio',async()=>{
 await publication('recurring-group');await db.query("UPDATE publications SET status='CANCELLED' WHERE id='recurring-group'");
 await db.query("INSERT INTO schedules(id,account_id,name,message,group_id,recurrence,send_time,status) VALUES('recurring',$1,'Diária','Mensagem autorizada','group-recurring-group','DAILY','09:00','PAUSED')",[a.id]);
 await assert.rejects(()=>setScheduleStatus(b.id,'recurring','ACTIVE'),e=>e.status===404);
 await setScheduleStatus(a.id,'recurring','ACTIVE');
 const due=new Date(Date.now()-10000).toISOString();await db.query("UPDATE schedules SET next_run_at=$1 WHERE id='recurring'",[due]);
 const jobs=await Promise.all([runSchedule(a.id,'recurring',due),runSchedule(a.id,'recurring',due)]);assert.equal(jobs.reduce((n,r)=>n+r.queued,0),1);
 const pub=(await db.query("SELECT * FROM publications WHERE schedule_id='recurring'")).rows[0];assert.equal(pub.content_type,'MESSAGE');assert.equal(pub.offer_id,null);
 assert.equal((await runSchedule(a.id,'recurring',due)).queued,0);
 await setScheduleStatus(a.id,'recurring','PAUSED');assert.equal((await db.query('SELECT status FROM publications WHERE id=$1',[pub.id])).rows[0].status,'CANCELLED');
 assert.equal((await runSchedule(a.id,'recurring')).queued,0);
});
test('feeds rejeitam destinos privados, redirects privados, HTML e excesso de tamanho',async()=>{
 await assert.rejects(()=>fetchOfferFeed('https://127.0.0.1/data'));
 const redirectRequest=async url=>{
  if(new URL(url).hostname==='10.0.0.1')throw new Error('Destino privado bloqueado');
  return new Response('',{status:302,headers:{location:'https://10.0.0.1/x'}});
 };
 await assert.rejects(()=>fetchOfferFeed('https://example.com/data',{request:redirectRequest}));
 await assert.rejects(()=>fetchOfferFeed('https://example.com/data',{request:async()=>new Response('<html>',{headers:{'content-type':'text/html'}})}));
 await assert.rejects(()=>fetchOfferFeed('https://example.com/data',{request:async()=>new Response('{}',{headers:{'content-type':'application/json','content-length':'1048577'}})}));
});
test('feed aplica deadline absoluto inclusive a uma requisição que não retorna',async()=>{
 const started=Date.now();
 await assert.rejects(()=>fetchOfferFeed('https://example.com/data',{
  timeout:25,
  request:()=>new Promise(()=>{})
 }),e=>e.status===408&&/Tempo limite absoluto/.test(e.message));
 assert.ok(Date.now()-started<500,'o timeout não deve ficar preso à promessa da origem');
});
test('feed compartilha o deadline entre redirecionamentos sucessivos',async()=>{
 let calls=0;
 await assert.rejects(()=>fetchOfferFeed('https://example.com/start',{
  timeout:25,
  request:async url=>{
   calls++;await new Promise(resolve=>setTimeout(resolve,15));
   return {status:302,ok:false,headers:{get:name=>name==='location'?(new URL(url).pathname==='/start'?'/second':'/third'):null},body:null};
  }
 }),e=>e.status===408&&/Tempo limite absoluto/.test(e.message));
 assert.ok(calls<=2,'o orçamento de tempo deve ser compartilhado entre os redirecionamentos');
});
test('feed aplica um único deadline ao consumo de um corpo lento',async()=>{
 let cancelled=false;
 const body=new ReadableStream({
  pull(controller){controller.enqueue(new TextEncoder().encode('{"offers":'));return new Promise(()=>{});},
  cancel(){cancelled=true;}
 });
 await assert.rejects(()=>fetchOfferFeed('https://example.com/data',{
  timeout:30,
  request:async()=>({status:200,ok:true,headers:{get:name=>name==='content-type'?'application/json':null},body})
 }),e=>e.status===408&&/Tempo limite absoluto/.test(e.message));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(cancelled,true,'o corpo deve ser cancelado ao atingir o deadline');
});
test('captura autorizada importa dados reais do feed, deduplica e mantém isolamento',async()=>{
 await db.query("INSERT INTO monitors(id,account_id,name,source_type,source_url,status,source_authorized) VALUES('feed-test',$1,'Feed','FEED','https://example.com/feed','ACTIVE',true),('unauthorized',$2,'Sem autorização','FEED','https://example.com/feed','PAUSED',false)",[a.id,b.id]);
 await assert.rejects(()=>canActivateMonitor(a.id,'unauthorized'),e=>e.status===404);await assert.rejects(()=>canActivateMonitor(b.id,'unauthorized'),e=>e.status===412);
 const fetchFeed=async()=>[{title:'Produto do feed',source:'AMAZON',currentPrice:49.9,originalPrice:99.9,affiliateUrl:'https://amazon.com.br/dp/feed?tag=test',productUrl:'https://amazon.com.br/dp/feed',imageUrl:'https://example.com/feed.png'},null];
 assert.equal((await runMonitors({accountId:a.id,monitorId:'feed-test',manual:true,fetchFeed})).captured,1);
 assert.equal((await runMonitors({accountId:a.id,monitorId:'feed-test',manual:true,fetchFeed})).checked,0);
 await db.query("UPDATE monitors SET last_run_at=now()-interval '2 minutes' WHERE id='feed-test'");
 assert.equal((await runMonitors({accountId:a.id,monitorId:'feed-test',manual:true,fetchFeed})).captured,0);
 const offer=(await db.query("SELECT current_price,source_monitor_id,status FROM offers WHERE title='Produto do feed'")).rows[0];assert.equal(offer.current_price,4990);assert.equal(offer.source_monitor_id,'feed-test');assert.equal(offer.status,'PENDING');
 assert.equal((await db.query("SELECT captured_count FROM monitors WHERE id='feed-test'")).rows[0].captured_count,1);
});
test('LGPD exige identidade, anonimiza apenas o titular e impede nova captura após revogação',async()=>{
 const hash='audit-contact-hash-123456';await publication('other-lead',b.id);
 await db.query("INSERT INTO lead_events(account_id,group_id,event_type,phone_hash,ddd) VALUES($1,'group-leased','JOIN',$3,'11'),($2,'group-other-lead','JOIN',$3,'22')",[a.id,b.id,hash]);
 await db.query("INSERT INTO privacy_requests(id,account_id,request_type,requester_email) VALUES('revoke-test',$1,'REVOCATION','lead@example.com')",[a.id]);
 await assert.rejects(()=>resolvePrivacyRequest(a.id,'revoke-test',{confirmation:'ANONIMIZAR'}),e=>e.status===412);
 await assert.rejects(()=>verifyPrivacyRequest(a.id,'revoke-test',{subjectScope:'ACCOUNT_OWNER',evidence:'Titular verificado'},'owner@example.com'),e=>e.status===403);
 await verifyPrivacyRequest(a.id,'revoke-test',{subjectScope:'LEAD',subjectHash:hash,evidence:'Contato verificado pelo operador'},'owner@example.com');
 assert.equal((await resolvePrivacyRequest(a.id,'revoke-test',{confirmation:'ANONIMIZAR'})).data.anonymized,true);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM lead_events WHERE account_id=$1 AND phone_hash=$2',[a.id,hash])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM lead_events WHERE account_id=$1 AND phone_hash=$2',[b.id,hash])).rows[0].n,1);
 assert.equal((await signed({accountId:a.id,action:'lead',eventId:'revoked-lead',groupId:'group-leased',eventType:'JOIN',phoneHash:hash})).body.recorded,false);
});
test('limpeza desativada por padrão; ao ativar remove apenas eventos antigos desta conta',async()=>{
 await db.query("INSERT INTO lead_events(account_id,group_id,event_type,phone_hash,occurred_at) VALUES($1,'group-leased','LEAVE','old-a',now()-interval '400 days'),($2,'group-other-lead','LEAVE','old-b',now()-interval '400 days')",[a.id,b.id]);
 assert.equal((await runRetention()).removed,0);
 await db.query("UPDATE account_security_settings SET retention_enabled=true WHERE account_id=$1",[a.id]);
 assert.equal((await runRetention({accountId:a.id,preview:true})).removed,1);
 assert.equal((await runRetention({accountId:a.id})).removed,1);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM lead_events WHERE phone_hash='old-b'")).rows[0].n,1);
});
test('portabilidade remove credenciais; backup restaura 36 tabelas e rejeita tamper ou outra conta',async()=>{
 const portable=await exportAccountData(a.id);assert.equal(portable.portable,true);assert.equal(portable.tables.connector_credential_bindings,undefined);assert.equal(portable.tables.marketplace_connections[0].access_token_enc,undefined);
 const snapshot=await accountSnapshot(a.id);const verified=await verifyBackup(snapshot);assert.equal(verified.restored,true);assert.equal(verified.tables,36);assert.equal(verified.rowCounts.promo_groups,snapshot.rowCounts.promo_groups);
 const bad=structuredClone(snapshot);bad.tables.accounts[0].id=b.id;await assert.rejects(()=>verifyBackup(bad),/outra conta/);
 const broken=structuredClone(snapshot);broken.rowCounts.offers++;await assert.rejects(()=>verifyBackup(broken),/Contagem/);
 const backup=await createAccountBackup(a.id);assert.ok(backup.sha256);assert.ok(backup.downloadPath.startsWith('/api/backups?id='));
 await db.query("UPDATE account_security_settings SET data_export_enabled=false WHERE account_id=$1",[a.id]);await assert.rejects(()=>exportAccountData(a.id),e=>e.status===412);
});
test('worker confirma recibo e reconcilia falha da ponte sem repetir chamada ao provedor',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'rpb-worker-'));const journal=new Journal(directory);await journal.init();let sends=0,fail=true,results=[];
 const adapter={send:async()=>{sends++;return {status:'PUBLISHED',externalMessageId:'real-provider-receipt'};}};
 const bridge={call:async(action,result)=>{if(fail)throw Error('network');results.push(result);}};
 const item={id:'worker-publication',dispatchToken:crypto.randomUUID(),connectionId:'worker-connection'};
 try{
  await assert.rejects(()=>deliverClaim(item,adapter,journal,bridge));assert.equal(sends,1);fail=false;await journal.reconcile(bridge);assert.equal(sends,1);assert.equal(results[0].externalMessageId,'real-provider-receipt');
  const token=crypto.randomUUID();await journal.save(token,{phase:'ISSUED',publicationId:'crash',dispatchToken:token,connectionId:'conn'});await journal.reconcile(bridge);assert.equal(results[1].status,'UNKNOWN');assert.equal(sends,1);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('adaptador Evolution trata timeout como incerto, sem repetição automática e sem envio fora dos grupos',async()=>{
 process.env.OPERATIONS_PROVIDER_TOKEN='fixture-token';
 const adapter=new WhatsappAdapter({type:'EVOLUTION',url:'https://example.com',tokenEnv:'OPERATIONS_PROVIDER_TOKEN',groups:['audit-group@g.us']});
 const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('timeout');};
 try{
  assert.equal((await adapter.send({connectionExternalId:'fixture',groupExternalId:'audit-group@g.us',contentType:'MESSAGE',message:'Teste'})).status,'UNKNOWN');assert.equal(calls,1);
  assert.equal((await adapter.send({groupExternalId:'unauthorized@g.us'})).status,'FAILED');assert.equal(calls,1);
 }finally{globalThis.fetch=old;delete process.env.OPERATIONS_PROVIDER_TOKEN;}
});
test('segredo requerido ausente no SDK mantém a tela de segurança disponível e pendente',async()=>{
 const old=config.get;config.get=async()=>{throw Error('Configuration value required but not set');};let status=200,body;
 try{
  await growthHandler({method:'GET',member:{id:'operation-owner'}},{status(s){status=s;return this;},json(v){body=v;return this;}});
  assert.equal(status,200);assert.equal(body.checks.find(x=>x.name==='Webhooks n8n').status,'PENDING');
 }finally{config.get=old;}
});
