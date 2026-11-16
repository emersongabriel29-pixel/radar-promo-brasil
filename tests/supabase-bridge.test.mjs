import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {config} from '../hatchable/index.js';
import {db} from '../lib/supabase-db.js';
import health from '../api/admin/supabase-health.js';

const originalFetch=globalThis.fetch,originalNow=Date.now,originalGet=config.get;
const values={};let clock=originalNow(),reads=0,calls=[];
const secret='synthetic-audit-secret-only-012345678901234567890';
const valid={ok:true,requestId:'audit-request',rows:[{answer:1}],rowCount:1};
const response=(body=valid,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const fetchResult=fn=>{globalThis.fetch=async(url,options)=>{calls.push({url,options});return fn(url,options)}};
const rejected=(promise,code,status)=>assert.rejects(promise,e=>e.code===code&&e.status===status);

test.before(()=>{
  Date.now=()=>clock;
  config.get=async key=>{reads++;return values[key]||''};
});
test.beforeEach(()=>{
  clock+=6000;reads=0;calls=[];
  values.supabase_db_bridge_url='https://audit.invalid/functions/v1/radar-db-bridge';
  values.SUPABASE_DB_BRIDGE_SECRET=secret;
  fetchResult(()=>response());
});
test.after(()=>{globalThis.fetch=originalFetch;Date.now=originalNow;config.get=originalGet});

test('ponte preserva SQL, parâmetros e assinatura HMAC sem retry automático',async()=>{
  const result=await db.query('SELECT $1::int AS answer',[1]);
  assert.deepEqual(result,valid);assert.equal(calls.length,1);
  const {options}=calls[0],headers=options.headers;
  assert.deepEqual(JSON.parse(options.body),{operation:'query',sql:'SELECT $1::int AS answer',params:[1]});
  const signed=headers['x-radar-timestamp']+'.'+headers['x-radar-nonce']+'.'+options.body;
  assert.equal(headers['x-radar-signature'],createHmac('sha256',secret).update(signed).digest('hex'));
  assert.equal(options.redirect,'error');assert.ok(options.signal);
});

test('ponte rejeita JSON inválido em HTTP 200',async()=>{
  fetchResult(()=>new Response('not-json'));
  await rejected(db.query('SELECT 1'),'SUPABASE_BRIDGE_INVALID_RESPONSE',502);
});

test('ponte exige ok:true e resultado de query com tipos válidos',async()=>{
  for(const body of [null,[],{},true,{ok:true},{ok:true,rows:null,rowCount:0},
    {ok:true,rows:[null],rowCount:1},{ok:true,rows:[[]],rowCount:1},
    {ok:true,rows:[],rowCount:'0'},{ok:true,rows:[],rowCount:-1},{ok:true,rows:[],rowCount:0.5}]){
    fetchResult(()=>response(body));
    await rejected(db.query('SELECT 1'),'SUPABASE_BRIDGE_INVALID_RESPONSE',502);
  }
});

test('ponte aceita query válida sem linhas',async()=>{
  fetchResult(()=>response({ok:true,rows:[],rowCount:0}));
  assert.deepEqual((await db.query('SELECT 1 WHERE false')).rows,[]);
});

test('ponte valida quantidade e contrato dos resultados transacionais',async()=>{
  const operations=[{sql:'SELECT $1',params:[1]},{sql:'SELECT $1',params:[2]}];
  const entry={rows:[{answer:1}],rowCount:1};
  fetchResult(()=>response({ok:true,requestId:'tx',results:[entry,entry]}));
  assert.equal((await db.transaction(operations)).results.length,2);
  assert.deepEqual(JSON.parse(calls[0].options.body),{operation:'transaction',operations});
  for(const results of [null,[],[entry],[entry,{}]]){
    fetchResult(()=>response({ok:true,results}));
    await rejected(db.transaction(operations),'SUPABASE_BRIDGE_INVALID_RESPONSE',502);
  }
});

test('ponte preserva erro seguro e status HTTP sem vazar corpo arbitrário',async()=>{
  fetchResult(()=>response({ok:false,error:'REPLAY_DETECTED',requestId:'audit-409'},409));
  await assert.rejects(db.query('SELECT 1'),e=>e.code==='REPLAY_DETECTED'&&e.status===409&&e.requestId==='audit-409');
  fetchResult(()=>response({ok:false,error:'sensitive provider details',requestId:'unsafe\nmetadata'},503));
  await assert.rejects(db.query('SELECT 1'),e=>e.code==='SUPABASE_DATABASE_ERROR'&&e.requestId===null&&!e.message.includes('sensitive'));
  fetchResult(()=>response({ok:false,error:'DATABASE_QUERY_FAILED'},200));
  await rejected(db.query('SELECT 1'),'DATABASE_QUERY_FAILED',502);
});

test('ponte não mascara erro HTTP não JSON nem repete consulta com entrega incerta',async()=>{
  fetchResult(()=>new Response('unavailable',{status:503}));
  await rejected(db.query('SELECT 1'),'SUPABASE_DATABASE_ERROR',503);
  calls=[];fetchResult(()=>{throw new Error('synthetic transport failure')});
  await rejected(db.query('UPDATE synthetic SET flag=true'),'SUPABASE_BRIDGE_UNREACHABLE',503);
  assert.equal(calls.length,1);
});

test('cache compartilha leituras concorrentes e relê URL e segredo após cinco segundos',async()=>{
  await Promise.all(Array.from({length:6},()=>db.query('SELECT 1')));
  assert.equal(reads,2);
  await db.query('SELECT 1');assert.equal(reads,2);
  values.supabase_db_bridge_url='https://audit-rotated.invalid/bridge';
  values.SUPABASE_DB_BRIDGE_SECRET=secret+'-rotated';clock+=5000;
  await db.query('SELECT 1');assert.equal(reads,4);
  const {url,options}=calls.at(-1);assert.equal(url,values.supabase_db_bridge_url);
  const h=options.headers,signed=h['x-radar-timestamp']+'.'+h['x-radar-nonce']+'.'+options.body;
  assert.equal(h['x-radar-signature'],createHmac('sha256',values.SUPABASE_DB_BRIDGE_SECRET).update(signed).digest('hex'));
});

test('configuração ausente e inválida recupera sem aguardar cache',async()=>{
  values.SUPABASE_DB_BRIDGE_SECRET='';
  await rejected(db.query('SELECT 1'),'SUPABASE_BRIDGE_NOT_CONFIGURED',503);
  assert.equal(calls.length,0);
  values.SUPABASE_DB_BRIDGE_SECRET=secret;
  await db.query('SELECT 1');assert.equal(calls.length,1);
});

test('falha de leitura da configuração não prende o cache',async()=>{
  config.get=async()=>{throw new Error('synthetic config failure')};
  try{await assert.rejects(db.query('SELECT 1'),/synthetic config failure/)}
  finally{config.get=async key=>{reads++;return values[key]||''}};
  await db.query('SELECT 1');assert.equal(calls.length,1);
});

test('configuração exige HTTPS sem credenciais ou fragmento antes do transporte',async()=>{
  for(const url of ['http://audit.invalid/bridge','https://user:pass@audit.invalid/bridge','https://audit.invalid/bridge#fragment','invalid']){
    values.supabase_db_bridge_url=url;
    await rejected(db.query('SELECT 1'),'SUPABASE_BRIDGE_INVALID_URL',503);
  }
  assert.equal(calls.length,0);
  values.supabase_db_bridge_url='https://audit.invalid/bridge';await db.query('SELECT 1');
  assert.equal(calls.length,1);
});

async function invokeHealth(){let status=200,body;const res={status(n){status=n;return this},json(v){body=v;return this}};await health({},res);return{status,body}}

test('health check só confirma sucesso com os dados da consulta esperada',async()=>{
  const row={database:'postgres',server_version:'17.11',checked_at:'2026-11-16T12:00:00.000Z'};
  fetchResult(()=>response({ok:true,rows:[row],rowCount:1}));
  assert.deepEqual(await invokeHealth(),{status:200,body:{ok:true,provider:'SUPABASE',database:'postgres',serverVersion:'17.11',checkedAt:row.checked_at}});
});

test('health check não declara ok com JSON quebrado, linhas vazias ou campos inválidos',async()=>{
  fetchResult(()=>new Response('broken'));
  const invalid=await invokeHealth();assert.equal(invalid.status,502);assert.equal(invalid.body.ok,false);
  assert.equal(invalid.body.code,'SUPABASE_BRIDGE_INVALID_RESPONSE');
  fetchResult(()=>response({ok:true,rows:[{database:'postgres',server_version:'17.11',checked_at:'2026-11-16T12:00:00Z'}],rowCount:0}));
  const countMismatch=await invokeHealth();assert.equal(countMismatch.status,502);
  assert.equal(countMismatch.body.code,'SUPABASE_HEALTH_INVALID_RESULT');
  for(const rows of [[],[{}],[{database:'postgres',server_version:'17.11',checked_at:'not-a-date'}],
    [{database:'',server_version:'17.11',checked_at:'2026-11-16'}],
    [{database:'postgres',server_version:'',checked_at:'2026-11-16'}],[{answer:1},{answer:2}]]){
    fetchResult(()=>response({ok:true,rows,rowCount:rows.length}));
    const r=await invokeHealth();assert.equal(r.status,502);assert.equal(r.body.ok,false);
    assert.equal(r.body.code,'SUPABASE_HEALTH_INVALID_RESULT');
  }
});
