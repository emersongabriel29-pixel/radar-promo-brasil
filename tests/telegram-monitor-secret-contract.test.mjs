import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Telegram monitor activation requires the same secret used by the incoming webhook', async () => {
  const monitoring = await read('../lib/monitoring.js');
  const incoming = await read('../api/telegram/incoming.js');

  assert.match(monitoring, /config\.get\('TELEGRAM_WEBHOOK_SECRET'\)/);
  assert.match(monitoring, /TELEGRAM_WEBHOOK_SECRET \(mínimo 32 caracteres\)/);
  assert.match(incoming, /config\.get\('TELEGRAM_WEBHOOK_SECRET'\)/);
  assert.match(incoming, /secret\.length<32/);
  assert.doesNotMatch(monitoring, /source_type==='TELEGRAM_CHANNEL'[\s\S]{0,240}N8N_WEBHOOK_SECRET/);
});
