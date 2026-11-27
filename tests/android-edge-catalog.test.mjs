import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

const source=readFileSync(new URL('../supabase/functions/radar-offers-feed/index.ts',import.meta.url),'utf8');
function harness(rows=[]) {
  const queries=[];
  let handler;
  const client={unsafe:async(statement,params)=>{queries.push({statement,params});return typeof rows==='function'?rows(statement):rows;}};
  const executable=stripTypeScriptTypes(source.replace(/^import postgres .*;\n/m,''));
  vm.runInNewContext(executable,{
    postgres:()=>client, URL, Response, console:{error(){}},
    Deno:{env:{get:()=> 'postgres://test-only'},serve:fn=>{handler=fn;}},
  });
  return {queries,call:(query='',method='GET')=>handler(new Request('https://example.invalid/feed'+query,{method}))};
}

test('catalog returns only names with fixed tenant and bound pagination',async()=>{
  const h=harness(statement=>statement.includes('public.categories')?[{name:'Categoria real do teste'}]:[{name:'Loja do teste'}]);
  const r=await h.call('?catalog=1&page=2&limit=10&account_id=untrusted');
  assert.equal(r.status,200);
  const b=await r.json();
  assert.deepEqual(b.categories,['Categoria real do teste']);
  assert.deepEqual(b.stores,['Loja do teste']);
  assert.equal(b.hasMore,false);
  assert.equal(h.queries.length,2);
  for(const q of h.queries){
    assert.match(q.statement,/a\.slug=\$1/);
    assert.match(q.statement,/a\.status='ACTIVE'/);
    assert.match(q.statement,/LIMIT \$2 OFFSET \$3/);
    assert.notEqual(q.params[0],'untrusted');
    assert.equal(q.params[1],10);
    assert.equal(q.params[2],10);
    assert.doesNotMatch(q.statement,/INSERT|UPDATE|DELETE|service_role/i);
  }
  assert.equal('offers' in b,false);
});
test('catalog signals another page when either set fills the limit',async()=>{
  const h=harness([{name:'One'}]);
  assert.equal((await (await h.call('?catalog=1&limit=1')).json()).hasMore,true);
});
test('invalid catalog and pagination are rejected before querying',async()=>{
  for(const query of ['?catalog=wrong','?catalog=1&page=0','?catalog=1&limit=1000']){
    const h=harness();assert.equal((await h.call(query)).status,400);assert.equal(h.queries.length,0);
  }
});
test('public feed remains read-only and preserves normal empty-feed contract',async()=>{
  const h=harness();
  const r=await h.call('?limit=1');
  const b=await r.json();
  assert.equal(r.status,200);assert.deepEqual(b.offers,[]);assert.equal(b.hasMore,false);
  assert.match(h.queries[0].statement,/offer_price_history/);
  assert.match(h.queries[0].statement,/OFFICIAL_API/);
  assert.equal((await h.call('?catalog=1','POST')).status,405);
});
test('catalog failures do not expose database errors',async()=>{
  const h=harness(()=>{throw new Error('private-connection-details');});
  const r=await h.call('?catalog=1');
  assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'60');
  assert.doesNotMatch(await r.text(),/private-connection-details/);
});
