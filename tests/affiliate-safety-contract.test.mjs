import test from 'node:test';
import assert from 'node:assert/strict';
import { isMedicationProduct } from '../lib/product-safety.js';
import { canEnterOfferFlow } from '../lib/offer-flow-policy.js';
import { readFileSync } from 'node:fs';

const safety = readFileSync(new URL('../lib/product-safety.js', import.meta.url), 'utf8');
const aliReview = readFileSync(new URL('../api/jobs/aliexpress-review.js', import.meta.url), 'utf8');
const delivery = readFileSync(new URL('../lib/delivery.js', import.meta.url), 'utf8');

test('medicamentos não são publicáveis e acessórios são preservados', () => {
  const offer={title:'Loratadina antialérgico',current_price:1000,affiliate_url:'https://example.com/afiliado'};
  assert.equal(isMedicationProduct(offer),true);
  assert.equal(canEnterOfferFlow(offer).reason,'MEDICATION_PUBLICATION_EXCLUDED');
  assert.equal(canEnterOfferFlow({...offer,title:'Porta comprimidos semanal'}).eligible,true);
});

test('delivery requires validated offers, official price evidence, and usable assets', () => {
  assert.match(delivery, /validation_status IN \('VALIDATED','APPROVED'\)/);
  assert.match(delivery, /source_type='OFFICIAL_API'/);
  assert.match(delivery, /current_price>0/);
  assert.match(delivery, /affiliate_url/);
  assert.match(delivery, /image_url/);
});

test('extension auto-approval is opt-in and disabled by default', async () => {
  const autopilot = readFileSync(new URL('../api/jobs/autopilot.js', import.meta.url), 'utf8');
  const extension = readFileSync(new URL('../api/jobs/extension-autopublish.js', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../migrations/058_extension_autopublish.sql', import.meta.url), 'utf8');
  assert.match(autopilot, /COALESCE\(s\.enabled,false\)=true/);
  assert.match(extension, /COALESCE\(s\.enabled,false\)=true/);
  assert.match(migration, /enabled boolean NOT NULL DEFAULT false/);
});
