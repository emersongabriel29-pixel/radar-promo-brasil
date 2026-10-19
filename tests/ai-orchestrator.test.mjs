import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const api = await readFile('api/ai/orchestrator.js','utf8');
const ui = await readFile('public/radar.js','utf8');

test('IA Central é autenticada, limitada a leituras agregadas e exige aprovação humana',()=>{
  assert.match(api,/export const access = 'member'/);
  assert.match(api,/export const methods = \['POST'\]/);
  assert.match(api,/SELECT status,count\(\*\)::int AS count FROM offers WHERE account_id=\$1 GROUP BY status/);
  assert.match(api,/SELECT name,status FROM account_integration_health WHERE account_id=\$1/);
  assert.doesNotMatch(api,/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+)?(?:offers|publications|promo_groups|social_posts|account_integration_health)/i);
  assert.match(api,/requiresApproval:true/);
  assert.match(api,/nenhuma configuração, oferta, fila ou publicação foi alterada/i);
  assert.match(ui,/\["ia-central", "IA Central"/);
  assert.match(ui,/Analisar panorama e preparar plano/);
});
