import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Telegram clone only resolves explicitly authorized Telegram monitors', async () => {
  const source = await read('../api/telegram/incoming.js');
  assert.match(
    source,
    /FROM monitors WHERE source_type='TELEGRAM_CHANNEL' AND status='ACTIVE' AND source_authorized=true AND lower\(trim\(source_url\)\)=ANY\(\$1::text\[\]\)/
  );
});

test('WhatsApp and Telegram clone ingestion remain isolated by source type', async () => {
  const telegram = await read('../api/telegram/incoming.js');
  const whatsapp = await read('../api/clone/whatsapp-incoming.js');
  assert.match(telegram, /source_type='TELEGRAM_CHANNEL'/);
  assert.match(whatsapp, /source_type='WHATSAPP_GROUP'/);
  assert.doesNotMatch(telegram, /FROM monitors WHERE status='ACTIVE' AND source_authorized=true/);
});
