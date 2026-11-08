import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryBackoffSeconds} from '../lib/delivery-retry.js';
import {telegramCall} from '../lib/telegram.js';
test('falha explícita conserva próximo retry mesmo após muitas tentativas',()=>{
 for(const attempt of [0,4,5,50,1000]){const seconds=deliveryBackoffSeconds(attempt);assert.ok(seconds>=300&&seconds<=21600);}
 assert.equal(deliveryBackoffSeconds(0,900),900);assert.equal(deliveryBackoffSeconds(50,86400),86400);
});
test('Telegram preserva status e retry_after sem marcar aceitação incerta como recusa explícita',async()=>{
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error_code:429,description:'Too Many Requests',parameters:{retry_after:900}}),{status:429});
  await assert.rejects(()=>telegramCall('fixture-token','sendMessage',{}),e=>e.status===429&&e.retryAfterSeconds===900&&e.code==='TELEGRAM_API_ERROR');
  globalThis.fetch=async()=>{throw Error('connection lost')};
  await assert.rejects(()=>telegramCall('fixture-token','sendMessage',{}),e=>e.code==='DELIVERY_UNCONFIRMED');
 }finally{globalThis.fetch=previous;}
});
