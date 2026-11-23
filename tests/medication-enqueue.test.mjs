import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PGLITE_DATA_DIR = ':memory:';
process.env.STANDALONE_SCHEDULER_ENABLED = 'false';
const { db, getDb } = await import('../hatchable/index.js');
const { getOrCreateAccount } = await import('../lib/accounts.js');
const { enqueueMatches } = await import('../lib/autopilot.js');
test('autopilot preserva medicamento sem enfileirar e mantém acessório publicável', async () => {
  try {
    const account = await getOrCreateAccount({ id: 'medication-enqueue-audit' });
    await db.query("INSERT INTO promo_groups(id,account_id,name,platform,external_id,status) VALUES('medication-test-group',$1,'Ofertas gerais','TELEGRAM','-audit','ACTIVE')", [account.id]);
    for (const [id, title] of [['medication-item', 'Paracetamol 750 mg'], ['accessory-item', 'Porta comprimidos organizador semanal']]) {
      await db.query("INSERT INTO offers(id,account_id,title,source,current_price,affiliate_url,status,validation_status) VALUES($1,$2,$3,'AMAZON',1990,'https://example.com/affiliate','APPROVED','VALIDATED')", [id, account.id, title]);
    }
    const result = await enqueueMatches(account.id);
    assert.equal(result.queued, 1);
    const queued = (await db.query('SELECT offer_id FROM publications WHERE account_id=$1', [account.id])).rows;
    assert.deepEqual(queued.map(row => row.offer_id), ['accessory-item']);
    const preserved = (await db.query("SELECT title,status,affiliate_url FROM offers WHERE id='medication-item' AND account_id=$1", [account.id])).rows[0];
    assert.equal(preserved.title, 'Paracetamol 750 mg');
    assert.equal(preserved.status, 'APPROVED');
    assert.equal(preserved.affiliate_url, 'https://example.com/affiliate');
    assert.equal((await enqueueMatches(account.id)).queued, 0);
  } finally {
    await (await getDb()).close();
  }
});
