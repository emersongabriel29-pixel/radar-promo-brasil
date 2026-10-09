import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicAddress} from '../lib/network-guard.js';

test('bloqueia faixas especiais IPv4 e IPv6 que não devem ser destinos de feeds',()=>{
  for(const address of [
    '192.88.99.1',
    '2002::1',
    '3fff::1',
    'fec0::1'
  ]) assert.equal(isPublicAddress(address),false,`deveria bloquear ${address}`);
});

test('continua aceitando endereços públicos IPv4 e IPv6',()=>{
  assert.equal(isPublicAddress('8.8.8.8'),true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
});
