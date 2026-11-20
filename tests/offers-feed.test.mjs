import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {publicFeedImages} from '../lib/feed-images.js';

const source=readFileSync(new URL('../api/public/offers-feed.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/gm,'')
  .replace(/export const /g,'const ')
  .replace('export default async function(req, res)','async function handler(req, res)');

test('feed authenticates before querying and binds the optional offer ID',async()=>{
  const queries=[];
  const db={query:async(sql,params)=>{queries.push({sql,params});return {rows:sql.includes('count(*)')?[{total:0}]:[]};}};
  const handler=runInNewContext(source+'\nhandler',{
    db,config:{get:async()=> 'test-only-feed-token'},storage:{},publicFeedImages,
    crypto:webcrypto,TextEncoder,Date
  });
  let status=200,body;
  const res={status(value){status=value;return this;},json(value){body=value;return this;},setHeader(){}};
  await handler({headers:{},query:{}},res);
  assert.equal(status,401);
  assert.equal(queries.length,0);
  const id="untrusted' OR true --";
  status=200;
  await handler({headers:{authorization:'Bearer test-only-feed-token'},query:{id,q:'phone',category:'tech'}},res);
  assert.equal(status,200);
  assert.equal(queries.length,2);
  assert.match(queries[0].sql,/o\.id=\$4/);
  assert.equal(queries[0].params[3],id);
  assert.ok(!queries[0].sql.includes(id));
  assert.equal(body.total,0);
});

test('feed signs cached media and omits internal storage keys',async()=>{
  const result=await publicFeedImages([{id:'offer',imageStorageKey:'private/file',imageUrl:'https://example.com/original.jpg'}],{
    url:async(key,options)=>{assert.equal(key,'private/file');assert.equal(options.ttl,300);return 'https://example.com/signed';}
  });
  assert.equal(result[0].imageUrl,'https://example.com/signed');
  assert.ok(!('imageStorageKey' in result[0]));
});
