import test from 'node:test';
import assert from 'node:assert/strict';
import {request,message,communityPath} from '../independent/radar-promo-ofertas/public/community-client.js';
test('community client keeps browser session same-origin and refuses external APIs',async()=>{
  let options;
  await request('/api/votes',{method:'POST',body:{offerId:'fixture',value:1},fetcher:async(path,init)=>{options=init;return new Response('{"ok":true}',{headers:{'content-type':'application/json'}});}});
  assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  assert.equal('Authorization' in options.headers,false);
  await assert.rejects(()=>request('https://untrusted.test/api/votes'));
  assert.throws(()=>communityPath('//untrusted.test'));
});
test('community client distinguishes quota, session and malformed responses',async()=>{
  await assert.rejects(()=>request('/api/account',{fetcher:async()=>new Response('',{status:401})}),e=>e.status===401);
  assert.match(message({status:429}),/limitado/);assert.match(message({status:401}),/sessão/);
  await assert.rejects(()=>request('/api/account',{fetcher:async()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}})}),/INVALID_RESPONSE/);
});
