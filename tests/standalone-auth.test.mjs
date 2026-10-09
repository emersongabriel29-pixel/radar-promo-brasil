import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticate,login,validateAuthConfiguration} from '../server/standalone-auth.js';
const secret='audit-only-credential-'.repeat(3);
function response(){return {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;},cookie(name,value,options){this.cookieResult={name,value,options};}};}
function request(headers={},method='GET'){return {headers,method,protocol:'https',get(){return 'audit.example.com';},is(type){return type==='application/json';},body:{}};}
let before;
test.before(()=>{before={...process.env};process.env.NODE_ENV='production';process.env.PUBLIC_APP_URL='https://audit.example.com';process.env.STANDALONE_AUTH_SECRET=secret;process.env.STANDALONE_API_TOKEN='api-token-for-audit-'.repeat(3);process.env.STANDALONE_USER_ID='owner';});
test.after(()=>{for(const key of ['NODE_ENV','PUBLIC_APP_URL','STANDALONE_AUTH_SECRET','STANDALONE_API_TOKEN','STANDALONE_USER_ID'])if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];});
test('produção recusa identidade ou segredo ausentes',()=>{delete process.env.STANDALONE_USER_ID;assert.throws(()=>validateAuthConfiguration(true));process.env.STANDALONE_USER_ID='owner';validateAuthConfiguration(true);});
test('visitante e bearer incorreto não recebem identidade',()=>{for(const headers of [{},{authorization:'Bearer incorrect'}]){const req=request(headers);let next=false;authenticate({production:true})(req,response(),()=>{next=true;});assert.equal(req.member,undefined);assert.equal(next,true);}});
test('login emite cookie seguro; requisição alteradora exige origem da instalação',()=>{const req=request({origin:'https://audit.example.com'},'POST');req.body={password:secret};const res=response();login(req,res);assert.equal(res.code,200);assert.equal(res.cookieResult.options.secure,true);assert.equal(res.cookieResult.options.httpOnly,true);assert.equal(res.cookieResult.options.sameSite,'strict');
 const cookie='radar_session='+res.cookieResult.value;
 const safe=request({cookie,origin:'https://audit.example.com'},'POST');authenticate({production:true})(safe,response(),()=>{});assert.equal(safe.member.id,'owner');
 for(const origin of [undefined,'https://attacker.example.com']){const r=response();authenticate({production:true})(request({cookie,origin},'POST'),r,()=>{});assert.equal(r.code,403);}
 const tampered=request({cookie:cookie+'a'});authenticate({production:true})(tampered,response(),()=>{});assert.equal(tampered.member,undefined);
});
test('bearer válido continua disponível a clientes da API e não autoriza login entre origens',()=>{const req=request({authorization:'Bearer '+process.env.STANDALONE_API_TOKEN},'POST');authenticate({production:true})(req,response(),()=>{});assert.equal(req.member.id,'owner');const wrongBearer=request({authorization:'Bearer '+secret},'POST');authenticate({production:true})(wrongBearer,response(),()=>{});assert.equal(wrongBearer.member,undefined);const cross=request({origin:'https://attacker.example.com'},'POST');cross.body={password:secret};const res=response();login(cross,res);assert.equal(res.code,403);});

test('logout revoga a sessão e o cookie usa chave derivada',async()=>{const {logout}=await import('../server/standalone-auth.js');const crypto=await import('node:crypto');const req=request({origin:'https://audit.example.com'},'POST');req.body={password:secret};const res=response();login(req,res);const cookie='radar_session='+res.cookieResult.value;const [payload]=res.cookieResult.value.split('.');assert.notEqual(res.cookieResult.value.split('.')[1],crypto.createHmac('sha256',secret).update(payload).digest('base64url'));const beforeReq=request({cookie});authenticate({production:true})(beforeReq,response(),()=>{});assert.equal(beforeReq.member.id,'owner');const out=response();out.clearCookie=()=>{};logout(request({cookie},'POST'),out);const after=request({cookie});authenticate({production:true})(after,response(),()=>{});assert.equal(after.member,undefined);});

test('revogação persistida continua válida após reinicialização do processo',async()=>{
 const {logout}=await import('../server/standalone-auth.js');
 const revokedRows=new Map();
 const store={async query(sql,params=[]){
   if(sql.startsWith('INSERT INTO standalone_session_revocations')){revokedRows.set(params[0],Number(params[1]));return {rows:[]};}
   if(sql.startsWith('DELETE FROM standalone_session_revocations')){for(const [nonce,exp] of revokedRows)if(exp<=Number(params[0]))revokedRows.delete(nonce);return {rows:[]};}
   if(sql.startsWith('SELECT nonce FROM standalone_session_revocations')){const exp=revokedRows.get(params[0]);return {rows:exp>Number(params[1])?[{nonce:params[0]}]:[]};}
   throw new Error('Consulta inesperada no teste de sessões');
 }};
 const loginReq=request({origin:'https://audit.example.com'},'POST');loginReq.body={password:secret};
 const loginRes=response();login(loginReq,loginRes);
 const cookie='radar_session='+loginRes.cookieResult.value;
 const out=response();out.clearCookie=()=>{};
 await logout(request({cookie},'POST'),out,{sessionStore:store});
 assert.equal(revokedRows.size,1);
 // Simula outro processo: o estado em memória não é consultado; somente o store durável decide.
 const nextReq=request({cookie});
 await new Promise((resolve,reject)=>authenticate({production:true,sessionStore:store})(nextReq,response(),error=>error?reject(error):resolve()));
 assert.equal(nextReq.member,undefined);
});
