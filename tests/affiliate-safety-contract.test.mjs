import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const safety = readFileSync(new URL('../lib/product-safety.js', import.meta.url), 'utf8');
const aliReview = readFileSync(new URL('../api/jobs/aliexpress-review.js', import.meta.url), 'utf8');
const delivery = readFileSync(new URL('../lib/delivery.js', import.meta.url), 'utf8');

test('medication safety blocks anti-allergy products and rejects them in AliExpress review', () => {
  assert.match(safety, /antialergic\[oa\]s\?/);
  assert.match(aliReview, /isMedicationProduct/);
  assert.match(aliReview, /Produto bloqueado pela política de segurança/);
  assert.match(aliReview, /REJECTED/);
});

test('delivery requires validated offers, official price evidence, and usable assets', () => {
  assert.match(delivery, /validation_status IN \('VALIDATED','APPROVED'\)/);
  assert.match(delivery, /source_type='OFFICIAL_API'/);
  assert.match(delivery, /current_price>0/);
  assert.match(delivery, /affiliate_url/);
  assert.match(delivery, /image_url/);
});
