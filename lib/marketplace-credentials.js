const SETTINGS = ['API_CREDENTIALS_MASTER_KEY', 'CONNECTOR_ENCRYPTION_KEY'];
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function deriveKey(master, accountId, marketplace) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|' + marketplace)
  );
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
}

export async function decryptMarketplaceCredentials({ accountId, marketplace, row, config }) {
  const masters = [];
  for (const setting of SETTINGS) {
    let value = '';
    try { value = String(await config.get(setting) || ''); } catch {}
    if (value.length >= 32 && !masters.includes(value)) masters.push(value);
  }
  if (!masters.length) {
    throw Object.assign(new Error('Configure API_CREDENTIALS_MASTER_KEY ou CONNECTOR_ENCRYPTION_KEY com pelo menos 32 caracteres.'), { status: 412 });
  }

  for (const master of masters) {
    try {
      const key = await deriveKey(master, accountId, marketplace);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
      let credentials;
      try { credentials = JSON.parse(new TextDecoder().decode(plain)); }
      catch { throw Object.assign(new Error('As credenciais salvas da integração estão corrompidas.'), { status: 500 }); }
      return { credentials, status: row.status };
    } catch (error) {
      if (error?.status) throw error;
    }
  }

  throw Object.assign(new Error('Não foi possível descriptografar as credenciais sem correspondência de chave. Confira API_CREDENTIALS_MASTER_KEY e CONNECTOR_ENCRYPTION_KEY; o registro foi preservado.'), { status: 412 });
}
