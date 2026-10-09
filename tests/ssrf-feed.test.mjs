import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {fetchOfferFeed} from '../lib/monitoring.js';

function mockRequest({responses,expectedPins=[]}){
  let index=0;
  const calls=[];
  const requestImpl=(url,options,callback)=>{
    const current=index++,target=new URL(url);
    calls.push({url:target.toString(),options});
    const request=new EventEmitter();
    request.setTimeout=()=>request;
    request.destroy=()=>request;
    request.end=()=>{
      options.lookup(target.hostname,{},(error,address,family)=>{
        if(error){request.emit('error',error);return;}
        if(expectedPins[current])assert.deepEqual({address,family},expectedPins[current]);
        const spec=responses[current];
        const response=Readable.from([Buffer.from(spec.body||'')]);
        response.statusCode=spec.statusCode||200;
        response.headers=spec.headers||{'content-type':'application/json'};
        callback(response);
      });
    };
    return request;
  };
  return {requestImpl,calls};
}

test('feed usa o IP validado na conexão HTTPS, sem nova resolução DNS',async()=>{
  const {requestImpl,calls}=mockRequest({
    responses:[{body:JSON.stringify({offers:[{title:'Produto'}]})}],
    expectedPins:[{address:'93.184.216.34',family:4}]
  });
  const resolve=async()=>({host:'feed.example',address:'93.184.216.34',family:4});
  const offers=await fetchOfferFeed('https://feed.example/offers.json',{resolve,requestImpl});
  assert.deepEqual(offers,[{title:'Produto'}]);
  assert.equal(calls.length,1);
});

test('cada redirecionamento é resolvido e fixado novamente',async()=>{
  const {requestImpl,calls}=mockRequest({
    responses:[
      {statusCode:302,headers:{location:'https://cdn.example/feed.json'}},
      {body:JSON.stringify({offers:[{title:'Redirecionado'}]})}
    ],
    expectedPins:[
      {address:'93.184.216.34',family:4},
      {address:'1.1.1.1',family:4}
    ]
  });
  const seen=[];
  const resolve=async url=>{
    seen.push(new URL(url).hostname);
    return new URL(url).hostname==='feed.example'
      ? {host:'feed.example',address:'93.184.216.34',family:4}
      : {host:'cdn.example',address:'1.1.1.1',family:4};
  };
  const offers=await fetchOfferFeed('https://feed.example/offers.json',{resolve,requestImpl});
  assert.deepEqual(offers,[{title:'Redirecionado'}]);
  assert.deepEqual(seen,['feed.example','cdn.example']);
  assert.equal(calls.length,2);
});

test('bloqueia redirecionamento para destino privado antes de conectar',async()=>{
  const {requestImpl,calls}=mockRequest({
    responses:[{statusCode:302,headers:{location:'https://internal.example/metadata'}}],
    expectedPins:[{address:'93.184.216.34',family:4}]
  });
  let lookups=0;
  const resolve=async url=>{
    lookups++;
    if(new URL(url).hostname==='internal.example')throw new Error('private address');
    return {host:'feed.example',address:'93.184.216.34',family:4};
  };
  await assert.rejects(fetchOfferFeed('https://feed.example/offers.json',{resolve,requestImpl}),/Origem HTTPS inválida/);
  assert.equal(lookups,2);
  assert.equal(calls.length,1);
});
