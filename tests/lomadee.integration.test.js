import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('Lomadee integration uses the public SDK API hosts and documented x-auth-key header', async () => {
  const source = await read('api/integrations/lomadee.js');
  assert.match(source, /https:\/\/api\.lomadee\.com\.br/);
  assert.match(source, /'x-api-key': apiKey/);
  assert.match(source, /\/affiliate\/products/);
  assert.match(source, /\/affiliate\/orders/);
});

test('Lomadee route is member-only and exposes only read-only remote queries', async () => {
  const source = await read('api/integrations/lomadee.js');
  assert.match(source, /export const access = 'member'/);
  assert.match(source, /export const methods = \['GET', 'POST'\]/);
  assert.match(source, /method,/);
  assert.match(source, /products:read/);
  assert.match(source, /orders:read/);
  assert.doesNotMatch(source, /method: 'DELETE'|method: 'PUT'|method: 'POST',\s*headers:/);
});

test('Lomadee order responses omit customer and personal-data fields', async () => {
  const source = await read('api/integrations/lomadee.js');
  const safeRows = source.slice(source.indexOf('function safeRows'), source.indexOf('export default async function handler'));
  assert.match(safeRows, /id: clean\(x\.id/);
  assert.match(safeRows, /orderId: clean\(x\.orderId \|\| x\.id/);
  assert.match(safeRows, /status: clean\(x\.status/);
  assert.doesNotMatch(safeRows, /customer|email|phone|document|address/i);
});
