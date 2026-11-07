import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [ingestion, config] = await Promise.all([
  readFile(new URL('api/jobs/marketplace-ingestion.js', root), 'utf8'),
  readFile(new URL('hatchable.toml', root), 'utf8')
]);

const cronMap = new Map(
  [...config.matchAll(/\[\[cron\]\]\s*path\s*=\s*"([^"]+)"\s*schedule\s*=\s*"([^"]+)"/g)]
    .map(([, route, schedule]) => [route, schedule])
);

test('marketplace ingestion does not consume one-shot scheduler budget', () => {
  assert.doesNotMatch(ingestion, /scheduler\.(?:now|at)\s*\(/);
  for (const key of ['lomadee', 'shopee', 'aliexpressReview', 'aiEnrichment']) {
    assert.ok(ingestion.includes(key + ': { ok: true, scheduledSeparately: true }'));
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
    assert.equal(cronMap.get(route), schedule, route + ' must keep its independent schedule');
    assert.equal([...cronMap.keys()].filter(value => value === route).length, 1, route + ' must be declared once');
  }
});

test('Telegram publication scheduler remains outside recurring cron declarations', () => {
  assert.equal(cronMap.has('/api/jobs/telegram'), false);
});
