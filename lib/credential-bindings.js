import { db } from 'hatchable';
export async function bindCredential(provider, slot, accountId) {
  const result=await db.query('INSERT INTO connector_credential_bindings(provider,credential_slot,account_id) VALUES($1,$2,$3) ON CONFLICT(provider,credential_slot) DO UPDATE SET account_id=connector_credential_bindings.account_id RETURNING account_id',[provider,String(slot),accountId]);
  if(result.rows[0]?.account_id!==accountId) throw Object.assign(new Error('Esta credencial pertence a outra conta. Configure uma credencial própria.'),{code:'CREDENTIAL_OWNERSHIP'});
}
export async function credentialBelongs(provider, slot, accountId) {
  return Boolean((await db.query('SELECT account_id FROM connector_credential_bindings WHERE provider=$1 AND credential_slot=$2 AND account_id=$3',[provider,String(slot),accountId])).rows[0]);
}
