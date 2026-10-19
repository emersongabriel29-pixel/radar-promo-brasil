import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const source = await readFile('api/jobs/api-health.js', 'utf8');
const config = await readFile('hatchable.toml', 'utf8');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? filesIn(path) : entry.name.endsWith('.js') ? [path] : [];
  }))).flat();
}

test('health check remains scheduler-only and runs on its declared cadence', () => {
  assert.match(source, /export const access\s*=\s*'scheduler'/);
  assert.match(source, /export const methods\s*=\s*\['POST'\]/);
  assert.match(config, /path\s*=\s*"\/api\/jobs\/api-health"\s*\r?\n\s*schedule\s*=\s*"30 \* \* \* \*"/);
});

test('n8n health probe checks REST and lists MCP tools without running a workflow/tool', () => {
  assert.match(source, /GET\s*:\s*'GET'|method:\s*'GET'/);
  assert.match(source, /workflows\?limit=1/);
  assert.match(source, /'initialize'/);
  assert.match(source, /'tools\/list'/);
  assert.match(source, /interval:'every 30 minutes'/);
  assert.match(source, /Nenhum workflow executado/);
  assert.match(source, /Nenhuma ferramenta remota executada/);
  assert.doesNotMatch(source, /'tools\/call'|workflows\/execute|executeWorkflow/);
});

test('every API route declares an access tier and allowed methods', async () => {
  const routes = await filesIn('api');
  assert.equal(routes.length, 77, 'update the documented production route count when routes are added or removed');
  for (const path of routes) {
    const route = await readFile(path, 'utf8');
    assert.match(route, /export const access\s*=\s*['"](public|member|admin|scheduler)['"]/, `${path} needs an explicit access tier`);
    assert.match(route, /export const methods\s*=\s*\[[^\]]+\]/, `${path} needs an explicit method allowlist`);
  }
});
