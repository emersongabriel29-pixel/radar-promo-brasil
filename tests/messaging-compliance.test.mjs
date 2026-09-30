import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateMessagingWindow} from '../lib/messaging-compliance.js';
test('texto false não representa consentimento ou template aprovado',()=>{assert.equal(evaluateMessagingWindow({channel:'WHATSAPP',approvedTemplate:'false',consentRecorded:'false'}).allowed,false);assert.equal(evaluateMessagingWindow({channel:'WHATSAPP',approvedTemplate:true,consentRecorded:true}).allowed,true);});
test('interação futura, inválida ou expirada não abre janela de mensagem',()=>{for(const lastInteractionAt of ['invalid',new Date(Date.now()+86400000).toISOString(),new Date(Date.now()-86400001).toISOString()])assert.equal(evaluateMessagingWindow({channel:'INSTAGRAM',lastInteractionAt}).allowed,false);});
