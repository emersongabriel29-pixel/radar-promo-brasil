import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const intake = readFileSync(new URL('../api/extension-offers.js', import.meta.url), 'utf8');
const queue = readFileSync(new URL('../api/jobs/extension-offers-resolve-queue.js', import.meta.url), 'utf8');

test('extension intake persists drafts without scheduling one one-shot per offer', () => {
  assert.doesNotMatch(intake, /scheduler\.now\s*\(/);
  assert.match(intake, /verificationQueued=\[['"]SHOPEE['"]/);
  assert.match(intake, /próximo ciclo automático/);
});

test('extension resolver queue is bounded, scheduled, and has a read-only dry run', () => {
  assert.match(queue, /const BATCH_SIZE = 5/);
  assert.match(queue, /LIMIT \$1/);
  assert.match(queue, /dryRun/);
  assert.match(queue, /publicationsCreated: 0/);
  assert.match(queue, /messagesSent: 0/);
  assert.doesNotMatch(queue, /scheduler\.(now|at)\s*\(/);
});
