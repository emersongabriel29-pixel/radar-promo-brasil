import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {favorites,votes,comments,notifications,publicComments} from '../independent/radar-promo-ofertas/lib/community.js';
import {validFeed,publicOffer} from '../independent/radar-promo-ofertas/lib/feed-contract.js';
import {publicFeedImages} from '../lib/feed-images.js';
const migration=fs.readFileSync(new URL('../independent/radar-promo-ofertas/migrations/0001_community.sql',import.meta.url),'utf8');
async function fixture(fn){
 const pg=new PGlite();await pg.exec(migration);
 const db={query:(sql,params)=>pg.query(sql,params),transaction:async operations=>pg.transaction(async tx=>{const out=[];for(const op of operations)out.push(await tx.query(op.sql,op.params));return out;})};
 try{await fn(db);}finally{await pg.close();}
}
const req=(id,method,body={},query={})=>({user:{id,name:'Participante'},method,body,query,headers:{}});
test('contract rejects upstream HTML-like or malformed objects',()=>{
 assert.equal(validFeed({offers:[],page:1,limit:30,total:0,hasMore:false}),true);
 for(const value of [null,[],{offers:[]},{offers:[],page:0,limit:30,total:0,hasMore:false}])assert.equal(validFeed(value),false);
});
test('feed hides storage keys and rejects unusable relative images',()=>{
 const out=publicOffer({id:'fixture',imageStorageKey:'private-fixture',imageUrl:'/private/path'});
 assert.equal(out.imageUrl,'');assert.equal('imageStorageKey' in out,false);
});
test('stored image receives signed URL, bounded TTL, no private key',async()=>{
 let opts;const out=await publicFeedImages([{id:'fixture',imageStorageKey:'private-fixture'}],{url:async(k,o)=>{opts=o;return 'https://images.example.test/signed';}});
 assert.equal(opts.ttl,300);assert.equal(out[0].imageUrl,'https://images.example.test/signed');assert.equal('imageStorageKey' in out[0],false);
});
test('image signing failure preserves the offer',async()=>{
 const out=await publicFeedImages([{id:'fixture',imageStorageKey:'private-fixture',title:'fixture'}],{url:async()=>{throw Error('unavailable');}});
 assert.equal(out.length,1);assert.equal(out[0].id,'fixture');assert.equal(out[0].imageUrl,'');
});
test('favorites are idempotent and ignore caller-supplied user identity',async()=>fixture(async db=>{
 await favorites(db,req('alice','POST',{offerId:'fixture',userId:'bob'}));
 await favorites(db,req('alice','POST',{offerId:'fixture'}));
 assert.equal((await favorites(db,req('alice','GET'))).favorites.length,1);
 assert.equal((await favorites(db,req('bob','GET'))).favorites.length,0);
 await favorites(db,req('bob','DELETE',{offerId:'fixture'}));
 assert.equal((await favorites(db,req('alice','GET'))).favorites.length,1);
}));
test('votes replace rather than duplicate and remain isolated',async()=>fixture(async db=>{
 await votes(db,req('alice','POST',{offerId:'fixture',value:1}));
 await votes(db,req('alice','POST',{offerId:'fixture',value:-1}));
 await votes(db,req('bob','POST',{offerId:'fixture',value:1}));
 const a=await votes(db,req('alice','GET',{}, {offerId:'fixture'}));
 assert.equal(a.total,2);assert.equal(a.score,0);assert.equal(a.myVote,-1);
 await assert.rejects(()=>votes(db,req('alice','POST',{offerId:'fixture',value:10})),e=>e.status===400);
}));
test('comment edit cannot affect another author and deletion removes public content',async()=>fixture(async db=>{
 const c=await comments(db,req('alice','POST',{offerId:'fixture',body:'Comentário de teste em memória'}));
 await assert.rejects(()=>comments(db,req('bob','PUT',{id:c.id,body:'alterado'})),e=>e.status===404);
 await comments(db,req('alice','DELETE',{id:c.id}));
 assert.equal((await publicComments(db,req('alice','GET',{}, {offerId:'fixture'}))).comments.length,0);
}));
test('notification consent is explicit and private per user',async()=>fixture(async db=>{
 assert.equal((await notifications(db,req('alice','GET'))).enabled,false);
 await notifications(db,req('alice','PUT',{enabled:true}));
 assert.equal((await notifications(db,req('alice','GET'))).enabled,true);
 assert.equal((await notifications(db,req('bob','GET'))).enabled,false);
 await assert.rejects(()=>notifications(db,req('alice','PUT',{enabled:'true'})),e=>e.status===400);
}));
test('anonymous writes and cross-origin browser writes are rejected',async()=>fixture(async db=>{
 await assert.rejects(()=>favorites(db,{method:'POST',body:{offerId:'fixture'}}),e=>e.status===401);
 const r=req('alice','POST',{offerId:'fixture'});r.headers.origin='https://untrusted.example.test';
 await assert.rejects(()=>favorites(db,r),e=>e.status===403);
}));
test('comment ownership is private and a reply alerts only its consenting author',async()=>fixture(async db=>{
 const original=await comments(db,req('alice','POST',{offerId:'fixture',body:'Pergunta'}));
 assert.equal((await comments(db,req('bob','GET',{}, {offerId:'fixture'}))).comments.length,0);
 assert.equal((await comments(db,req('alice','GET',{}, {offerId:'fixture'}))).comments.length,1);
 await comments(db,req('bob','POST',{offerId:'fixture',body:'Sem consentimento',replyToId:original.id}));
 assert.equal((await notifications(db,req('alice','GET'))).notifications.length,0);
 await notifications(db,req('alice','PUT',{enabled:true}));
 await comments(db,req('alice','POST',{offerId:'fixture',body:'Minha resposta',replyToId:original.id}));
 await comments(db,req('bob','POST',{offerId:'other',body:'Outra oferta',replyToId:original.id}));
 assert.equal((await notifications(db,req('alice','GET'))).notifications.length,0);
 await comments(db,req('bob','POST',{offerId:'fixture',body:'Resposta válida',replyToId:original.id}));
 const inbox=await notifications(db,req('alice','GET'));
 assert.equal(inbox.notifications.length,1);assert.equal(inbox.notifications[0].body,'Resposta válida');
 assert.equal((await notifications(db,req('bob','GET'))).notifications.length,0);
 await notifications(db,req('bob','POST',{id:inbox.notifications[0].id}));
 assert.equal((await notifications(db,req('alice','GET'))).notifications[0].readAt,null);
 await notifications(db,req('alice','POST',{id:inbox.notifications[0].id}));
 assert.ok((await notifications(db,req('alice','GET'))).notifications[0].readAt);
}));
