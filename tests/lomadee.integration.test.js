import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('api/integrations/lomadee.js', 'utf8');

test('Lomadee uses the documented API host and x-api-key authentication', () => {
  assert.match(source, /const BASE_URL = 'https:\/\/api\.lomadee\.com\.br'/);
  assert.match(source, /'x-api-key': apiKey/);
  assert.doesNotMatch(source, /x-auth-key|dashboard-api\.lomadee|commissions\.lomadee|orders\.lomadee/);
});

test('Lomadee is member-only and limits requests to documented resources and explicit actions', () => {
  assert.match(source, /export const access = 'member'/);
  assert.match(source, /export const methods = \['GET', 'POST'\]/);
  assert.match(source, /\['\/affiliate\/products','\/affiliate\/brands','\/affiliate\/campaigns','\/affiliate\/channels','\/affiliate\/orders','\/affiliate\/shortener\/url','\/affiliate\/shortener\/urls'\]/);
  assert.match(source, /action === 'validate'/);
  assert.match(source, /action === 'shorten_url'/);
  assert.match(source, /action === 'import_products'/);
  assert.match(source, /published: false/);
  assert.match(source, /autopilotTriggered: false, publicationTriggered: false/);
  assert.doesNotMatch(source, /method: 'DELETE'|method: 'PUT'/);
});

test('Lomadee order responses use an allowlist and omit customer personal data', () => {
  const safeRows = source.slice(source.indexOf('function safeRows'), source.indexOf('export default async function handler'));
  assert.ok(safeRows.length > 0, 'safeRows projection exists');
  assert.match(safeRows, /if \(resource === 'orders'\)/);
  assert.match(safeRows, /id: clean\(x\.id, 120\)/);
  assert.match(safeRows, /orderId: clean\(x\.orderId \|\| x\.id, 120\)/);
  assert.match(safeRows, /commissionStatus: clean\(x\.commissionStatus, 40\)/);
  assert.match(safeRows, /items: items\.slice\(0, 50\)\.map/);
  assert.doesNotMatch(safeRows, /customer|email|phone|document|address/i);
});
