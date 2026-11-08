import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PGLITE_DATA_DIR=':memory:';process.env.STANDALONE_SCHEDULER_ENABLED='false';
const {db,getDb}=await import('../hatchable/index.js');
const {getOrCreateAccount}=await import('../lib/accounts.js');
const {default:review}=await import('../api/jobs/aliexpress-review.js');
const {enqueueMatches}=await import('../lib/autopilot.js');
test.before(async()=>{await getDb();});test.after(async()=>{await (await getDb()).close();});
async function fixture(owner){const a=await getOrCreateAccount({id:owner});await db.query("INSERT INTO promo_groups(id,account_id,name,platform,external_id,status) VALUES($1,$2,'Ofertas gerais','TELEGRAM','-fixture','ACTIVE')",['group-'+owner,a.id]);return a;}
async function offer(a,id,title,source='ALIEXPRESS',extra={}){await db.query("INSERT INTO offers(id,account_id,title,source,current_price,original_price,score,affiliate_url,product_url,status,validation_status,classification_status,imported_by) VALUES($1,$2,$3,$4,1000,1000,1,'https://example.com/afiliado','https://aliexpress.com/item/123.html','PENDING','PENDING_REVIEW','REVIEW',$5)",[id,a.id,title,source,extra.importedBy||'AUTO']);}
test('AliExpress publica sem desconto/score mínimos, preserva medicamento e mantém isolamento de origem',async()=>{
 const a=await fixture('ali-review-behavior');await offer(a,'ali-no-discount','Cabo USB');await offer(a,'ali-medication','Paracetamol 750 mg');await offer(a,'shopee-isolated','Cabo Shopee','SHOPEE');
 let response;await review({body:{}},{json(v){response=v;return this;}});assert.equal(response.approved,1);assert.equal(response.medicationExcluded,1);
 const queued=(await db.query('SELECT p.offer_id FROM publications p WHERE p.account_id=$1',[a.id])).rows.map(x=>x.offer_id);assert.deepEqual(queued,['ali-no-discount']);
 const med=(await db.query("SELECT status,validation_status,classification_reason FROM offers WHERE id='ali-medication'")).rows[0];assert.equal(med.status,'PENDING');assert.equal(med.validation_status,'NEEDS_REVIEW');assert.equal(med.classification_reason,'MEDICATION_PUBLICATION_EXCLUDED');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM offers WHERE account_id=$1',[a.id])).rows[0].n,3);
});
test('aprovação automática da extensão exige opt-in, aprovação manual continua permitida',async()=>{
 const a=await fixture('extension-opt-in-behavior');await offer(a,'extension-pending','Produto compartilhado','AMAZON',{importedBy:'CHROME_EXTENSION'});
 assert.equal((await enqueueMatches(a.id,'extension-pending')).queued,0);
 await db.query("INSERT INTO extension_autopublish_settings(account_id,enabled) VALUES($1,true) ON CONFLICT(account_id) DO UPDATE SET enabled=true",[a.id]);
 assert.equal((await enqueueMatches(a.id,'extension-pending')).queued,1);
 await db.query('UPDATE extension_autopublish_settings SET enabled=false WHERE account_id=$1',[a.id]);await offer(a,'extension-manual','Produto aprovado manualmente','AMAZON',{importedBy:'CHROME_EXTENSION'});await db.query("UPDATE offers SET status='APPROVED',validation_status='VALIDATED' WHERE id='extension-manual'");assert.equal((await enqueueMatches(a.id,'extension-manual')).queued,1);
});
