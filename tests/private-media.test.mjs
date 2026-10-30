import test from 'node:test';
import assert from 'node:assert/strict';
import {offerImage} from '../lib/offer-images.js';

test('stored offer images use an authenticated media route by default',async()=>{
  assert.equal(await offerImage({id:'offer-1',imageStorageKey:'products/member-1/abc.jpg'}),'/api/media/offer/offer-1');
});

test('stored offer images use a gated public route only when explicitly requested',async()=>{
  assert.equal(await offerImage({id:'offer-1',imageStorageKey:'products/member-1/abc.jpg'},{publicAccess:true}),'/api/public/media/offer-1');
});

test('external image URLs remain unchanged',async()=>{
  assert.equal(await offerImage({id:'offer-1',imageUrl:'https://cdn.example.com/a.jpg'}),'https://cdn.example.com/a.jpg');
});
