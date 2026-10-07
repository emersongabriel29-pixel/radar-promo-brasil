import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldCountClick} from '../lib/click-filter.js';
const req=(agent,ip='1.2.3.4',method='GET')=>({method,ip,headers:{'user-agent':agent}});
const chrome='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';

test('ignora previews, robôs, HEAD e User-Agent ausente',()=>{
  assert.equal(shouldCountClick(req('WhatsApp/2.24.1 A'),'a1'),false);
  assert.equal(shouldCountClick(req('facebookexternalhit/1.1'),'a2'),false);
  assert.equal(shouldCountClick(req('TelegramBot (like TwitterBot)'),'a3'),false);
  assert.equal(shouldCountClick(req(chrome,'1.2.3.4','HEAD'),'a4'),false);
  assert.equal(shouldCountClick({method:'GET',ip:'1.1.1.1',headers:{}},'a5'),false);
});

test('deduplica por IP+User-Agent durante 30 minutos',()=>{
  const t=Date.now();
  assert.equal(shouldCountClick(req(chrome),'b1',t),true);
  assert.equal(shouldCountClick(req(chrome),'b1',t+60000),false);
  assert.equal(shouldCountClick(req(chrome,'9.9.9.9'),'b1',t+60000),true);
  assert.equal(shouldCountClick(req(chrome),'b1',t+31*60000),true);
});
