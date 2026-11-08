import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPromo } from '../lib/promo-classifier.js';

test('Black Friday requires explicit campaign evidence',()=>{
  assert.equal(classifyPromo({currentPrice:40,originalPrice:100,promoMetadata:{campaign_name:'Black Friday 2026',status:'ACTIVE'}}).type,'BLACK_FRIDAY');
  assert.equal(classifyPromo({currentPrice:40,originalPrice:100}).type,'DISCOUNT');
});
test('expired campaign metadata cannot produce a seasonal hook',()=>{
  assert.equal(classifyPromo({promoMetadata:{campaign_name:'Black Friday 2025',status:'EXPIRED'}}).type,'STANDARD');
});
test('flash sale requires explicit marketplace metadata',()=>{
  assert.equal(classifyPromo({currentPrice:10,originalPrice:100}).type,'DISCOUNT');
  assert.equal(classifyPromo({promoMetadata:{promo_type:'FLASH_SALE',status:'ACTIVE'}}).type,'FLASH_SALE');
});
test('coupon takes precedence over ordinary discount',()=>{
  assert.equal(classifyPromo({couponCode:'CASA10',currentPrice:90,originalPrice:100}).type,'COUPON');
});
test('campaign metadata accepts nested raw_data objects and JSON strings',()=>{
  assert.equal(classifyPromo({promoMetadata:{raw_data:JSON.stringify({promo_name:'Black Week',status:'ACTIVE'})}}).type,'BLACK_FRIDAY');
});
