import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('fila de publicações reivindica item com lock, escopo de conta e estados permitidos', async () => {
  const source = await read('../lib/delivery.js');
  assert.match(source, /SELECT id FROM accounts WHERE id=\$1 FOR UPDATE/);
  assert.match(source, /p\.account_id=\$2 AND p\.status IN \('READY','RETRY'\)/);
  assert.match(source, /g\.id=p\.group_id AND g\.account_id=p\.account_id/);
  assert.match(source, /in_flight\.account_id=p\.account_id AND in_flight\.group_id=p\.group_id/);
  assert.match(source, /in_flight\.status='DISPATCHING'/);
});

test('fila respeita validade da oferta e validação recente de preço oficial', async () => {
  const source = await read('../lib/delivery.js');
  assert.match(source, /ph\.source_type='OFFICIAL_API'/);
  assert.match(source, /ph\.verified_at>now\(\)-interval '24 hours'/);
  assert.match(source, /ph\.price=verified_offer\.current_price/);
  assert.match(source, /ph\.original_price IS NOT DISTINCT FROM verified_offer\.original_price/);
  assert.match(source, /verified_offer\.account_id=p\.account_id/);
});

test('agendamento recorrente cria publicação idempotente e avança a próxima execução sob lock', async () => {
  const source = await read('../lib/recurrences.js');
  assert.match(source, /SELECT id FROM accounts WHERE id=\$1 FOR UPDATE/);
  assert.match(source, /ON CONFLICT DO NOTHING RETURNING id/);
  assert.match(source, /s\.next_run_at=\$5/);
  assert.match(source, /s\.next_run_at<=now\(\)/);
  assert.match(source, /s\.next_run_at>now\(\)-interval '60 minutes'/);
  assert.match(source, /'recurrence:'\+id\+':'\+localParts\(due,row\.timezone\)\.day/);
});

test('ingestão do Modo Clone exige segredo, origem autorizada e identificador para deduplicação', async () => {
  const source = await read('../api/clone/whatsapp-incoming.js');
  assert.match(source, /WHATSAPP_CLONE_WEBHOOK_SECRET/);
  assert.match(source, /x-rpb-whatsapp-secret/);
  assert.match(source, /source_authorized=true AND status='ACTIVE'/);
  assert.match(source, /if\(monitors\.length>1\).*?409/s);
  assert.match(source, /if\(!messageId\)return res\.status\(400\)/);
  assert.match(source, /ON CONFLICT\(provider,event_key\) DO NOTHING RETURNING id/);
  assert.match(source, /autoPublished:0/);
});
