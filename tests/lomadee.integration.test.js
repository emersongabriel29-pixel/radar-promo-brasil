import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('Lomadee integration uses the public SDK API hosts and documented x-auth-key header', async () => {
  const source = await read('api/integrations/lomadee.js');
  assert.match(source, /https:\/\/dashboard-api\.lomadee\.com\.br/);
  assert.match(source, /https:\/\/commissions\.lomadee\.com\.br/);
  assert.match(source, /https:\/\/orders\.lomadee\.com\.br/);
  assert.match(source, /'x-auth-key': apiKey/);
});

test('Lomadee route is member-only and exposes only read-only remote queries', async () => {
  const source = await read('api/integrations/lomadee.js');
  assert.match(source, /export const access = 'member'/);
  assert.match(source, /export const methods = \['GET', 'POST'\]/);
  assert.match(source, /method: 'GET'/);
  assert.match(source, /\['contents', 'commissions', 'orders'\]/);
  assert.doesNotMatch(source, /method: 'DELETE'|method: 'PUT'|method: 'POST',\s*headers:/);
});

test('Lomadee order responses omit customer and personal-data fields', async () => {
  const source = await read('api/integrations/lomadee.js');
  const safeRows = source.slice(source.indexOf('function safeRows'), source.indexOf('export default async function handler'));
  assert.match(safeRows, /id: clean\(x\.id \|\| x\.orderId/);
  assert.match(safeRows, /status: clean\(x\.status/);
  assert.doesNotMatch(safeRows, /customer|email|phone|document|address/i);
});
