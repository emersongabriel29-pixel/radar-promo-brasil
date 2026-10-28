import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { decryptMarketplaceCredentials } from '../lib/marketplace-credentials.js';

globalThis.crypto ||= webcrypto;

async function encryptedRow(master, accountId, marketplace, credentials) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|' + marketplace)
  );
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(JSON.stringify(credentials)));
  return {
    nonce: btoa(String.fromCharCode(...nonce)),
    credentials_enc: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    status: 'PENDING_VALIDATION'
  };
}

function configFor(values) {
  return { get: async name => values[name] || '' };
}

test('marketplace credentials decrypt with the current API master key', async () => {
  const row = await encryptedRow('a'.repeat(64), 'account-1', 'SHOPEE', { appId: '123' });
  const result = await decryptMarketplaceCredentials({
    accountId: 'account-1', marketplace: 'SHOPEE', row,
    config: configFor({ API_CREDENTIALS_MASTER_KEY: 'a'.repeat(64), CONNECTOR_ENCRYPTION_KEY: 'b'.repeat(64) })
  });
  assert.deepEqual(result, { credentials: { appId: '123' }, status: 'PENDING_VALIDATION' });
});

test('marketplace credentials fall back to the legacy connector key without rewriting ciphertext', async () => {
  const row = await encryptedRow('b'.repeat(64), 'account-2', 'AMAZON', { clientId: 'legacy' });
  const originalCiphertext = row.credentials_enc;
  const result = await decryptMarketplaceCredentials({
    accountId: 'account-2', marketplace: 'AMAZON', row,
    config: configFor({ API_CREDENTIALS_MASTER_KEY: 'a'.repeat(64), CONNECTOR_ENCRYPTION_KEY: 'b'.repeat(64) })
  });
  assert.deepEqual(result.credentials, { clientId: 'legacy' });
  assert.equal(row.credentials_enc, originalCiphertext);
});

test('marketplace credentials give a setup error when no encryption key is configured', async () => {
  await assert.rejects(
    decryptMarketplaceCredentials({ accountId: 'account-3', marketplace: 'AWIN', row: {}, config: configFor({}) }),
    error => error.status === 412 && /API_CREDENTIALS_MASTER_KEY/.test(error.message)
  );
});
