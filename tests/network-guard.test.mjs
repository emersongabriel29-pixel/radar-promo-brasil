import test from 'node:test';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import assert from 'node:assert/strict';
import {assertPublicHost,fetchPinnedHttps,isPublicAddress,resolvePublicHost} from '../lib/network-guard.js';

test('bloqueia faixas privadas, loopback, link-local, CGNAT e metadata',()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','172.20.0.1','192.168.0.9','169.254.169.254','100.64.0.1','0.0.0.0','::1','fc00::1','fe80::1','::ffff:127.0.0.1','::ffff:8.8.8.8','::ffff:808:808','0:0:0:0:0:ffff:808:808','2001:20::1'])assert.equal(isPublicAddress(ip),false,ip);
  for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(isPublicAddress(ip),true,ip);
});

test('rejeita domínio que resolve para qualquer IP interno',async()=>{
  await assert.rejects(assertPublicHost('https://evil.example/x',{lookup:async()=>[{address:'10.0.0.5'}]}),/não é público/);
  await assert.rejects(assertPublicHost('https://mix.example/x',{lookup:async()=>[{address:'8.8.8.8'},{address:'169.254.169.254'}]}),/não é público/);
  await assert.rejects(assertPublicHost('https://mapped.example/x',{lookup:async()=>[{address:'::ffff:808:808'}]}),/não é público/);
});

test('aceita domínio público e rejeita falha de DNS',async()=>{
  assert.equal(await assertPublicHost('https://ok.example/x',{lookup:async()=>[{address:'93.184.216.34'}]}),true);
  await assert.rejects(assertPublicHost('https://nx.example/x',{lookup:async()=>{throw new Error('ENOTFOUND');}}),/não é público/);
});


test('retorna o IP validado para permitir conexão sem nova consulta DNS',async()=>{
  const resolved=await resolvePublicHost('https://ok.example/x',{lookup:async()=>[{address:'93.184.216.34'},{address:'93.184.216.35'}]});
  assert.deepEqual(resolved,{host:'ok.example',address:'93.184.216.34',family:4});
});


test('requisição HTTPS usa o mesmo IP público validado no lookup',async()=>{
  let requestOptions;
  const requestImpl=(_url,options,callback)=>{
    requestOptions=options;
    const request=new EventEmitter();
    request.setTimeout=()=>{};
    request.destroy=error=>request.emit('error',error);
    request.end=()=>callback(Object.assign(Readable.from(['{"offers":[]}']),{
      statusCode:200,
      headers:{'content-type':'application/json','content-length':'14'}
    }));
    return request;
  };
  const response=await fetchPinnedHttps('https://feed.example/offers',{
    lookup:async()=>[{address:'93.184.216.34',family:4}],
    requestImpl
  });
  let lookupResult;
  requestOptions.lookup('feed.example',{},(error,address,family)=>{lookupResult={error,address,family}});
  assert.deepEqual(lookupResult,{error:null,address:'93.184.216.34',family:4});
  assert.equal(response.ok,true);
  const reader=response.body.getReader();
  const chunk=await reader.read();
  assert.equal(new TextDecoder().decode(chunk.value),'{"offers":[]}');
});

test('não abre conexão quando o DNS resolve para IP privado',async()=>{
  let requested=false;
  await assert.rejects(fetchPinnedHttps('https://feed.example/offers',{
    lookup:async()=>[{address:'127.0.0.1',family:4}],
    requestImpl:()=>{requested=true;throw new Error('não deveria conectar')}
  }),/não é público/);
  assert.equal(requested,false);
});
