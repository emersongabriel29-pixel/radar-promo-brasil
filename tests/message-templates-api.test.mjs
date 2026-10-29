import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PGLITE_DATA_DIR = ':memory:';
process.env.STANDALONE_SCHEDULER_ENABLED = 'false';
const { db, getDb } = await import('../hatchable/index.js');
const { getOrCreateAccount } = await import('../lib/accounts.js');
const { default: templatesHandler } = await import('../api/messages/templates.js');

const owner = { id: 'template-owner', display_name: 'Conta A' };
const other = { id: 'template-other', display_name: 'Conta B' };
let accountA, accountB;
async function invoke(method, body = {}, member = owner, query = {}) {
  let status = 200, output;
  const response = {
    status(code) { status = code; return this; },
    json(value) { output = value; return this; },
  };
  await templatesHandler({ method, body, member, query }, response);
  return { status, body: output };
}

test.before(async () => {
  await getDb();
  accountA = await getOrCreateAccount(owner);
  accountB = await getOrCreateAccount(other);
});
test.after(async () => { await (await getDb()).close(); });

test('CRUD de modelos persiste na conta e permite pré-visualizar variáveis permitidas', async () => {
  const created = await invoke('POST', { name: 'Oferta rápida', body: '{{produto}} por {{preco}}: {{link_afiliado}}' });
  assert.equal(created.status, 201);
  const id = created.body.template.id;
  assert.equal(created.body.template.name, 'Oferta rápida');
  const listed = await invoke('GET');
  assert.equal(listed.status, 200);
  assert.equal(listed.body.templates.length, 1);
  assert.ok(listed.body.variables.includes('produto'));
  const updated = await invoke('PUT', { id, name: 'Oferta rápida v2', body: '🔥 {{produto}} — {{preco}}', isActive: false });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.template.name, 'Oferta rápida v2');
  assert.equal(updated.body.template.isActive, false);
  const row = (await db.query('SELECT name,body,is_active FROM message_templates WHERE account_id=$1 AND id=$2', [accountA.id, id])).rows[0];
  assert.deepEqual(row, { name: 'Oferta rápida v2', body: '🔥 {{produto}} — {{preco}}', is_active: false });
  assert.equal((await invoke('DELETE', {}, owner, { id })).status, 200);
  assert.equal((await invoke('GET')).body.templates.length, 0);
});

test('modelos têm isolamento por conta, inclusive ao editar ou excluir', async () => {
  const created = await invoke('POST', { name: 'Privado A', body: '{{produto}}' });
  const id = created.body.template.id;
  assert.equal((await invoke('GET', {}, other)).body.templates.length, 0);
  assert.equal((await invoke('PUT', { id, name: 'Tomado', body: 'x' }, other)).status, 404);
  assert.equal((await invoke('DELETE', { id }, other)).status, 404);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM message_templates WHERE account_id=$1 AND id=$2', [accountA.id, id])).rows[0].count, 1);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM message_templates WHERE account_id=$1', [accountB.id])).rows[0].count, 0);
});

test('rejeita variáveis desconhecidas, conteúdo excessivo e nomes duplicados', async () => {
  assert.equal((await invoke('POST', { name: 'Ruim', body: '{{token_privado}}' })).status, 400);
  assert.equal((await invoke('POST', { name: 'Grande', body: 'x'.repeat(3001) })).status, 400);
  assert.equal((await invoke('POST', { name: 'Único', body: 'texto' })).status, 201);
  assert.equal((await invoke('POST', { name: 'Único', body: 'outro texto' })).status, 409);
});

test('não autorizado não lê nem altera modelos', async () => {
  assert.equal((await invoke('GET', {}, null)).status, 401);
  assert.equal((await invoke('POST', { name: 'Não', body: 'x' }, {})).status, 401);
});
