import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PGLITE_DATA_DIR=':memory:';
process.env.STANDALONE_SCHEDULER_ENABLED='false';
const {db,getDb}=await import('../hatchable/index.js');
const {getOrCreateAccount}=await import('../lib/accounts.js');
const {claimPublication,deferUnsentPublications}=await import('../lib/delivery.js');
const {medicationProductSql,isMedicationProduct}=await import('../lib/product-safety.js');
const {dispatchSocialPosts,prepareSocialPosts}=await import('../lib/social-autopilot.js');
const {default:redirect}=await import('../api/r/[id].js');
let account;
test.before(async()=>{account=await getOrCreateAccount({id:'medication-publication-owner'});await db.query("INSERT INTO promo_groups(id,account_id,name,platform,external_id,status) VALUES('medicine-destination',$1,'Destino isolado','TELEGRAM','-test','ACTIVE')",[account.id]);
 for(let i=0;i<cases.length;i++){
  await db.query("INSERT INTO offers(id,account_id,title,source,current_price,affiliate_url,status,validation_status) VALUES($1,$2,$3,'AMAZON',1990,'https://example.com/afiliado','APPROVED','VALIDATED')",['med-policy-'+i,account.id,cases[i]]);
 }
});
test.after(async()=>{await (await getDb()).close();});
const cases=['Paracetamol 750 mg','Loratadina antialérgico','Remédio para dor','Porta comprimidos organizador semanal','Vibrador íntimo recarregável','Dipirona 500mg'];
test('predicado SQL e detector concordam para medicamento, acessório e +18',async()=>{
 const rows=(await db.query(`SELECT o.title,${medicationProductSql('o')} AS medication FROM offers o WHERE o.account_id=$1`,[account.id])).rows;
 for(const row of rows)assert.equal(row.medication,isMedicationProduct({title:row.title}),row.title);
 assert.throws(()=>medicationProductSql('o; DROP TABLE offers'));
});
test('claim de fila preexistente bloqueia medicamento sem apagar e permite acessório',async()=>{
 for(const i of [0,3])await db.query("INSERT INTO publications(id,account_id,offer_id,group_id,status,eligibility_policy_version) VALUES($1,$2,$3,'medicine-destination','READY','master_v1')",['med-claim-'+i,account.id,'med-policy-'+i]);
 assert.equal(await claimPublication(db,'med-claim-0',account.id),undefined);
 const before=(await db.query("SELECT status,attempts FROM publications WHERE id='med-claim-0'")).rows[0];assert.equal(before.status,'READY');assert.equal(before.attempts,0);
 assert.ok(await claimPublication(db,'med-claim-3',account.id));
});
test('publicação social antiga de medicamento não chama provedor nem incrementa tentativa',async()=>{
 await db.query("INSERT INTO social_autopilot_settings(account_id,status,start_time,end_time) VALUES($1,'ACTIVE','00:00','00:00') ON CONFLICT(account_id) DO UPDATE SET status='ACTIVE',start_time='00:00',end_time='00:00'",[account.id]);
 await db.query("INSERT INTO social_posts(id,account_id,offer_id,channel,message,image_url,affiliate_url,status,scheduled_at,idempotency_key) VALUES('medicine-social',$1,'med-policy-0','FACEBOOK','Mensagem','https://example.com/image.png','https://example.com/afiliado','READY',now()-interval '1 minute','medicine-social-key')",[account.id]);
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Chamada externa proibida no teste')};
 try{await dispatchSocialPosts(account.id,10);assert.equal(calls,0);const row=(await db.query("SELECT status,attempts FROM social_posts WHERE id='medicine-social'")).rows[0];assert.equal(row.status,'READY');assert.equal(row.attempts,0);}finally{globalThis.fetch=previous;}
});
test('redirect de publicação medicamentosa antiga não incrementa clique nem expõe link',async()=>{
 await db.query("INSERT INTO publications(id,account_id,offer_id,group_id,status,published_at) VALUES('med-redirect',$1,'med-policy-0','medicine-destination','PUBLISHED',now())",[account.id]);
 let status=200,redirected=false;await redirect({params:{id:'med-redirect'},headers:{'user-agent':'audit'},method:'GET'},{status(code){status=code;return this;},send(){return this;},redirect(){redirected=true;return this;}});
 assert.equal(status,404);assert.equal(redirected,false);assert.equal((await db.query("SELECT clicks FROM publications WHERE id='med-redirect'")).rows[0].clicks,0);
});

test('capacidade libera somente claims não enviados com token e conta corretos',async()=>{
 for(const [id,status,token] of [['defer-ok','DISPATCHING','valid'],['defer-stale','DISPATCHING','current'],['defer-uncertain','WAITING_CONFIRMATION','valid']])await db.query("INSERT INTO publications(id,account_id,offer_id,group_id,status,attempts,dispatch_token) VALUES($1,$2,'med-policy-3','medicine-destination',$3,2,$4)",[id,account.id,status,token]);
 const items=[{id:'defer-ok',dispatchToken:'valid'},{id:'defer-stale',dispatchToken:'stale'},{id:'defer-uncertain',dispatchToken:'valid'}];
 assert.equal(await deferUnsentPublications(db,'another-account',items),0);
 assert.equal(await deferUnsentPublications(db,account.id,items),1);
 const rows=(await db.query("SELECT id,status,attempts,dispatch_token,next_attempt_at FROM publications WHERE id LIKE 'defer-%'")).rows;
 const ok=rows.find(x=>x.id==='defer-ok');assert.equal(ok.status,'RETRY');assert.equal(ok.attempts,1);assert.equal(ok.dispatch_token,null);assert.ok(ok.next_attempt_at);
 assert.equal(rows.find(x=>x.id==='defer-stale').status,'DISPATCHING');assert.equal(rows.find(x=>x.id==='defer-uncertain').status,'WAITING_CONFIRMATION');
});

test('social preserva aprovação e aceita score baixo mesmo após teto diário legado',async()=>{
 await db.query("UPDATE social_autopilot_settings SET require_approval=true,channels='[\"FACEBOOK\"]'::jsonb,min_score=99,max_posts_per_day=1 WHERE account_id=$1",[account.id]);
 await db.query("UPDATE offers SET score=0,image_url='https://example.com/image.png' WHERE id='med-policy-4'");
 const previous=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Sem rede no teste')};
 try{const result=await prepareSocialPosts(account.id,{offerId:'med-policy-4',limit:1});assert.equal(result.generated,1);const row=(await db.query("SELECT status FROM social_posts WHERE offer_id='med-policy-4'")).rows[0];assert.equal(row.status,'DRAFT');assert.equal((await prepareSocialPosts(account.id,{offerId:'med-policy-4',limit:1})).generated,0);}finally{globalThis.fetch=previous;}
});
