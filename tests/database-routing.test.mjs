import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const adapter = readFileSync(new URL('../lib/radar-db.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export async function getDbProvider', 'async function getDbProvider')
  .replace('export const db', 'const db');

function fixture(initial = false) {
  let enabled = initial, now = 10000, configReads = 0;
  const calls = [];
  const provider = name => ({
    query: async (...args) => { calls.push([name, 'query', ...args]); return { rows: [{ provider: name }] }; },
    transaction: async (...args) => { calls.push([name, 'transaction', ...args]); return { results: [] }; }
  });
  const hatchableDb = provider('HATCHABLE'), supabaseDb = provider('SUPABASE');
  const config = { get: async name => {
    assert.equal(name, 'supabase_db_enabled');
    configReads++;
    if (enabled instanceof Error) throw enabled;
    return enabled;
  } };
  const router = runInNewContext(adapter + '\n({db,getDbProvider})', {
    config, hatchableDb, supabaseDb, Date: { now: () => now }
  });
  return { ...router, calls, supabaseDb, set: value => { enabled = value; },
    advance: ms => { now += ms; }, reads: () => configReads };
}

test('disabled provider preserves Hatchable query arguments and result', async () => {
  const f = fixture(false), params = ['account'];
  const result = await f.db.query('SELECT $1', params);
  assert.equal(result.rows[0].provider, 'HATCHABLE');
  assert.equal(f.calls[0][3], params);
  assert.equal(await f.getDbProvider(), 'HATCHABLE');
});

test('enabled provider routes queries and transactions to Supabase', async () => {
  for (const enabled of [true, 'true', ' TRUE ']) {
    const f = fixture(enabled), operations = [{sql:'SELECT $1',params:[42]}];
    assert.equal((await f.db.query('SELECT 1')).rows[0].provider, 'SUPABASE');
    await f.db.transaction(operations);
    assert.equal(f.calls[1][0], 'SUPABASE');
    assert.equal(f.calls[1][2], operations);
    assert.equal(await f.getDbProvider(), 'SUPABASE');
  }
});

test('Supabase failure never silently writes into Hatchable', async () => {
  const f = fixture(true), failure = new Error('bridge unavailable');
  f.supabaseDb.query = async () => { throw failure; };
  f.supabaseDb.transaction = async () => { throw failure; };
  await assert.rejects(f.db.query('INSERT INTO example VALUES ($1)', [1]), error => error === failure);
  await assert.rejects(f.db.transaction([{sql:'INSERT INTO example VALUES ($1)',params:[1]}]), error => error === failure);
  assert.equal(f.calls.length, 0);
});

test('configuration is shared by concurrent calls and refreshes after TTL', async () => {
  const f = fixture(false);
  await Promise.all([f.getDbProvider(), f.db.query('SELECT 1'), f.db.query('SELECT 2')]);
  assert.equal(f.reads(), 1);
  f.set(true);
  assert.equal(await f.getDbProvider(), 'HATCHABLE');
  f.advance(5001);
  assert.equal(await f.getDbProvider(), 'SUPABASE');
  assert.equal(f.reads(), 2);
});

test('configuration errors prevent writes and allow recovery', async () => {
  const f = fixture(new Error('configuration unavailable'));
  await assert.rejects(f.db.query('INSERT INTO example VALUES (1)'));
  assert.equal(f.calls.length, 0);
  f.set(true);
  assert.equal(await f.getDbProvider(), 'SUPABASE');
});

test('application entry points cannot bypass the selected database provider', () => {
  const root = new URL('../', import.meta.url);
  function scan(directory) {
    for (const entry of readdirSync(new URL(directory, root), {withFileTypes:true})) {
      const path = directory + entry.name;
      if (entry.isDirectory()) { if (entry.name !== 'documentation') scan(path + '/'); continue; }
      if (!path.endsWith('.js') || path.endsWith('.test.js') || path === 'lib/radar-db.js') continue;
      const source = readFileSync(new URL(path, root), 'utf8');
      for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]hatchable['"]/g)) {
        assert.ok(!match[1].split(',').some(name => /^db(?:\s|$)/.test(name.trim())), path + ' bypasses database routing');
      }
    }
  }
  for (const directory of ['api/','lib/','pages/','mcp/']) scan(directory);
});
