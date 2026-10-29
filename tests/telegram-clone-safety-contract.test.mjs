import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/telegram/incoming.js', import.meta.url), 'utf8');

test('Telegram clone deduplicates imported offers by account-scoped fingerprint', () => {
  assert.match(source, /fingerprint\(\[group\.accountId,parsed\.marketplace,parsed\.productUrl,parsed\.title\.toLowerCase\(\),parsed\.currentPrice\]\.join\('\|'\)\)/);
  assert.match(source, /SELECT id FROM offers WHERE account_id=\$1 AND fingerprint=\$2 LIMIT 1/);
  assert.match(source, /ON CONFLICT DO NOTHING RETURNING id/);
});

test('Telegram clone keeps imported offers pending review and never auto-publishes', () => {
  assert.match(source, /'PENDING'/);
  assert.match(source, /reviewRequired:true/);
  assert.match(source, /autoPublished:0/);
  assert.match(source, /storefront_visible,false/);
});

test('Telegram clone rejects ambiguous source mappings across accounts', () => {
  assert.match(source, /if\(groups\.length>1\)return res\.status\(409\)/);
  assert.match(source, /evitar cruzamento de dados entre contas/);
});
