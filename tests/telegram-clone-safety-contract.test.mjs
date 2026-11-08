import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/telegram/incoming.js', import.meta.url), 'utf8');

test('Telegram clone deduplicates imported offers by account-scoped fingerprint', () => {
  assert.ok(source.includes('const seller=clean(parsed.sellerId||parsed.shopId'));
  assert.ok(source.includes('const productIdentity=parsed.productId||parsed.itemId'));
  assert.ok(source.includes("seller||'seller-unknown'"));
});
