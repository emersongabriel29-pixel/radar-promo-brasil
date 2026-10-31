import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Android share form only requires the product URL and its own token',async()=>{
  const html=await read('public/share-import.html');
  assert.match(html,/id="url" required/);
  assert.match(html,/id="token" required/);
  for(const id of ['title','price','original','image'])assert.doesNotMatch(html,new RegExp('id="'+id+'"[^>]*required'));
});

test('Android share page previews product metadata and retains token only in session storage',async()=>{
  const js=await read('public/share-import.js');
  assert.match(js,/\/api\/extension-offers-preview/);
  assert.match(js,/rpb_android_share_token/);
  assert.match(js,/\/api\/extension-offers/);
  assert.match(js,/Importar como rascunho|rascunho pendente/);
});

test('share preview is authenticated, Android-token-only and host allowlisted',async()=>{
  const api=await read('api/extension-offers-preview.js');
  assert.match(api,/Compartilhamento Android/);
  assert.match(api,/hostAllowed/);
  assert.match(api,/REDIRECT_FORA_DO_MARKETPLACE/);
  assert.match(api,/browser\.session/);
  assert.doesNotMatch(api,/INSERT INTO offers/i);
});

test('Android imports stay pending and never trigger autopublish',async()=>{
  const intake=await read('api/extension-offers.js');
  const resolver=await read('api/jobs/extension-offers-resolve.js');
  assert.match(intake,/ANDROID_SHARE/);
  assert.match(resolver,/imported_by IN \('CHROME_EXTENSION','ANDROID_SHARE'\)/);
  assert.match(resolver,/offer\.imported_by!=='ANDROID_SHARE'/);
});
