import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [ui, shell, theme, shopee, shopeeJob, readiness, healthEndpoint, healthJob, schedule] = await Promise.all([
  readFile('public/radar.js', 'utf8'),
  readFile('pages/index.js', 'utf8'),
  readFile('public/radar-theme-v5.css', 'utf8'),
  readFile('api/integrations/shopee.js', 'utf8'),
  readFile('api/jobs/shopee.js', 'utf8'),
  readFile('api/readiness.js', 'utf8'),
  readFile('api/integrations/health-summary.js', 'utf8'),
  readFile('api/jobs/api-health.js', 'utf8'),
  readFile('hatchable.toml', 'utf8')
]);

test('painel de saúde é síncrono e usa o endpoint de diagnóstico de leitura', () => {
  assert.match(ui, /function integrationHealthPanel\(\)/);
  assert.doesNotMatch(ui, /async function integrationHealthPanel\(\)/);
  assert.match(ui, /integrationHealthPanel\(\) \+/);
  assert.match(ui, /\/api\/integrations\/health-summary/);
  assert.match(ui, /'integrationHealth'/);
});

test('monitoramento identifica explicitamente o escopo limitado ao n8n', () => {
  assert.match(ui, /Monitoramento do n8n/);
  assert.match(ui, /API REST e o MCP do n8n/);
  assert.match(healthEndpoint, /export const access = 'member'/);
  assert.match(healthEndpoint, /export const methods = \['GET'\]/);
  assert.match(healthEndpoint, /n8n_api_rest/);
  assert.match(healthEndpoint, /n8n_mcp/);
  assert.match(healthEndpoint, /account_integration_health/);
  assert.match(healthEndpoint, /account_id=\$1/);
  assert.doesNotMatch(healthEndpoint, /INSERT|UPDATE|DELETE/i);
  assert.match(healthJob, /account_integration_health/);
  assert.match(healthJob, /export const access = 'scheduler'/);
  assert.match(healthJob, /\/api\/v1\/workflows\?limit=1/);
  assert.match(healthJob, /tools\/list/);
  assert.doesNotMatch(healthJob, /tools\/call/);
  assert.match(schedule, /path = "\/api\/jobs\/api-health"[\s\S]*?schedule = "30 \* \* \* \*"/);
});

test('padrão do filtro de desconto preserva o comportamento da produção', () => {
  assert.match(ui, /minDiscountPercent','number','min="0" max="90" value="0"'/);
});

test('shell usa versões atuais dos ativos sem remover os handlers seguros', () => {
  assert.match(shell, /radar-theme-v5\.css\?v=20261019-offers-workspace-v1/);
  assert.match(shell, /radar\.js\?v=20261027-shopee-connect-fix-v1/);
  assert.match(shell, /data-action="menu\(true\)"/);
  assert.match(shell, /data-action="openOffer\(\)"/);
});

test('tema contém a área de trabalho de Ofertas da produção', () => {
  assert.match(theme, /\.offers-workspace/);
  assert.match(theme, /\.offers-categories/);
});

test('Shopee continua em modo de teste somente leitura e não publica', () => {
  assert.match(shopee, /readOnlyTest: true/);
  assert.match(shopee, /publicationEnabled: false/);
});

test('consulta e ingestão Shopee tentam ambas as chaves de criptografia sem depender da precedência', () => {
  for (const source of [shopee, shopeeJob]) {
    assert.match(source, /API_CREDENTIALS_MASTER_KEY/);
    assert.match(source, /CONNECTOR_ENCRYPTION_KEY/);
    assert.match(source, /for \(const master of masters\)/);
    assert.match(source, /credential.*decript|descriptografar|legacy key/i);
  }
});

test('prontidão inclui verificações separadas de Runway e Gemini', () => {
  assert.match(readiness, /geminiVideo/);
  assert.match(readiness, /RUNWAY_API_KEY/);
  assert.match(readiness, /GEMINI_API_KEY/);
});
