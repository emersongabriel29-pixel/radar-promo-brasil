import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiRoot = path.join(root, 'api');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
}
walk(apiRoot);

test('every API handler declares an explicit access contract and allowed HTTP methods', () => {
  assert.ok(files.length > 0, 'API handlers should be discovered');
  const invalid = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const access = source.match(/export\s+const\s+access\s*=\s*['"](public|member|admin|scheduler)['"]/);
    const methods = source.match(/export\s+const\s+methods\s*=\s*\[([^\]]*)\]/);
    if (!access || !methods || !methods[1].trim() || !/^\s*['"][A-Z]+['"](?:\s*,\s*['"][A-Z]+['"])*\s*$/.test(methods[1])) {
      invalid.push(path.relative(root, file));
    }
  }
  assert.deepEqual(invalid, [], 'API handlers missing an explicit access/method contract');
});

test('server applies global API safety controls before dynamically registering handlers', () => {
  const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(source, /applySecurityHeaders/);
  assert.match(source, /createRateLimiter\(\{\s*windowMs:\s*60000,\s*max:\s*180\s*\}\)/);
  assert.match(source, /express\.json\(\{\s*limit:\s*['"]256kb['"]/);
  assert.match(source, /app\.disable\(['"]x-powered-by['"]\)/);
  assert.match(source, /app\.use\(['"]\/uploads['"],\s*\(req,\s*res\)\s*=>\s*res\.status\(404\)/);
  assert.match(source, /\['public',\s*'member',\s*'admin',\s*'scheduler'\]/);
  assert.match(source, /module\.access/);
  assert.match(source, /module\.methods/);
});

test('publication jobs are scheduler-only and webhook stays public POST with secret validation', () => {
  const job = fs.readFileSync(path.join(apiRoot, 'jobs', 'telegram.js'), 'utf8');
  const webhook = fs.readFileSync(path.join(apiRoot, 'telegram', 'incoming.js'), 'utf8');
  assert.match(job, /export\s+const\s+access\s*=\s*['"]scheduler['"]/);
  assert.match(job, /status='DISPATCHING'/);
  assert.match(job, /WHERE id=\$1 AND account_id=\$2/);
  assert.match(webhook, /export\s+const\s+access\s*=\s*['"]public['"]/);
  assert.match(webhook, /constantTimeSecretMatch/);
  assert.match(webhook, /isPlainObject\(req\.body\)/);
  assert.match(webhook, /safePublicError\(\)/);
  assert.doesNotMatch(webhook, /detail:\s*clean\(error\?\.message/);
});
