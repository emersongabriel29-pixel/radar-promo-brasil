import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {publicFeedImages} from '../lib/feed-images.js';

const id='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const source=fs.readFileSync(new URL('../api/public/offers-feed.js',import.meta.url),'utf8');
function handler(db,text=source) {
  // Execute the real handler against PostgreSQL in memory; replace only its SDK imports.
  const code=text.replace(/^import .*;\s*$/gm,'').replace('export default async function','return async function').replaceAll('export const ','const ');
  return new Function('db','storage','config','publicFeedImages',code)(db,{url:async()=>''},{get:async()=> 'isolated-fixture-token'},publicFeedImages);
}
async function fixture(fn) {
  const pg=new PGlite();
  await pg.exec(`
    CREATE TABLE accounts(id text,slug text,status text);
    CREATE TABLE categories(id text,account_id text,name text,icon text);
    CREATE TABLE offers(id uuid,account_id text,title text,source text,current_price numeric,original_price numeric,image_url text,image_storage_key text,affiliate_url text,discount_percent int,radar_score int,score int,coupon_code text,created_at timestamptz,category_id text,subcategory text,status text);
    CREATE TABLE offer_price_history(account_id text,offer_id uuid,source_type text,verified_at timestamptz,original_price numeric,price numeric);
    INSERT INTO accounts VALUES('account-a','emersongabriel29-888956','ACTIVE'),('account-b','other-fixture','ACTIVE');
    INSERT INTO categories VALUES('category-a','account-a','Categoria real do teste','');
  `);
  for(const [offerId,account] of [[id,'account-a'],[other,'account-b']]){
    await pg.query(`INSERT INTO offers VALUES($1,$2,'Produto fixture','Loja fixture',10,20,'','','https://example.test/?aff=fixture',50,0,0,'',now(),'category-a','','APPROVED')`,[offerId,account]);
    await pg.query(`INSERT INTO offer_price_history VALUES($1,$2,'OFFICIAL_API',now(),20,10)`,[account,offerId]);
  }
  const req={method:'GET',headers:{authorization:'Bearer isolated-fixture-token'},query:{id,q:'Produto',category:'Categoria real do teste'}};
  const res={setHeader(){},status(code){this.statusCode=code;return this;},json(value){this.body=value;return value;}};
  try{await fn(pg,req,res);}finally{await pg.close();}
}
test('ID filter works together with search, category, count and account isolation',async()=>fixture(async(pg,req,res)=>{
  await handler({query:(sql,params)=>pg.query(sql,params)})(req,res);
  assert.equal(res.body.total,1);assert.equal(res.body.offers.length,1);assert.equal(res.body.offers[0].id,id);
  req.query.id=other;
  await handler({query:(sql,params)=>pg.query(sql,params)})(req,res);
  assert.equal(res.body.total,0);assert.deepEqual(res.body.offers,[]);
}));
test('regression fixture reproduces the previous missing-placeholder failure',async()=>fixture(async(pg,req,res)=>{
  const previous=source.replace('o.id=$${params.length}','o.id=${params.length}');
  await assert.rejects(()=>handler({query:(sql,params)=>pg.query(sql,params)},previous)(req,res),/operator does not exist|uuid|integer/);
}));
