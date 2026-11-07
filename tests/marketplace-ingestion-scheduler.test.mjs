import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [ingestion, config] = await Promise.all([
  readFile(new URL('api/jobs/marketplace-ingestion.js', root), 'utf8'),
  readFile(new URL('hatchable.toml', root), 'utf8')
]);

function cronFor(route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = config.match(new RegExp('\\[\\[cron\\]\\]\\s*path\\s*=\\s*"' + escaped + '"\\s*schedule\\s*=\\s*"([^"]+)"'));
  return match?.[1] || null;
}

test('marketplace ingestion does not consume one-shot scheduler budget', () => {
  assert.doesNotMatch(ingestion, /scheduler\\.(?:now|at)\\s*\\(/);
  for (const key of ['lomadee', 'shopee', 'aliexpressReview', 'aiEnrichment']) {
    assert.match(ingestion, new RegExp(key + ': \\{ ok: true, scheduledSeparately: true \\}'));
  }
});

test('each marketplace and enrichment worker has exactly one hourly recurring cron', () => {
  const expected = new Map([
    ['/api/jobs/lomadee', '15 * * * *'],
    ['/api/jobs/aliexpress', '25 * * * *'],
    ['/api/jobs/shopee', '35 * * * *'],
    ['/api/jobs/aliexpress-review', '45 * * * *'],
    ['/api/jobs/ai-enrichment', '55 * * * *']
  ]);
  for (const [route, schedule] of expected) {
    assert.equal(cronFor(route), schedule, route + ' must keep its independent schedule');
    const count = (config.match(new RegExp('path\\s*=\\s*"' + route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g')) || []).length;
    assert.equal(count, 1, route + ' must not be declared more than once');
  }
});

test('Telegram publication scheduler remains outside recurring cron declarations', () => {
  assert.equal(cronFor('/api/jobs/telegram'), null);
});
