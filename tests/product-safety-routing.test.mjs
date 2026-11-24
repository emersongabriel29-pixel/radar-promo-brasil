import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('public redirect refuses medication offers in both publication and social paths', async () => {
  const code = await source('api/r/[id].js');
  assert.equal((code.match(/NOT \$\{medicationProductSql\('o'\)\}/g) || []).length, 2);
});

test('Lomadee queue marks medication products BLOCKED_SAFETY', async () => {
  const code = await source('api/jobs/lomadee-discovery-queue.js');
  assert.match(code, /if \(classification\.blocked\)\s*\{\s*status = 'BLOCKED_SAFETY';\s*reason = 'MEDICATION_PRODUCT_EXCLUDED';/);
  assert.doesNotMatch(code, /processing_status='BLOCKED_SAFETY'\s+OR/);
});

test('social autopilot excludes medication offers during discovery and final claim', async () => {
  const code = await source('lib/social-autopilot.js');
  assert.equal((code.match(/NOT \$\{medicationProductSql\('o'\)\}/g) || []).length, 2);
});
