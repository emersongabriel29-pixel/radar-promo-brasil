import { config, db, webhooks } from 'hatchable';
import { persistDiscoveryPage } from 'lib/affiliate-discovery.js';

export const access = 'public';
export const methods = ['POST'];

const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');

async function storedLomadeeApiKey(row) {
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('credential_key_missing');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(master + '|radar-marketplace-credentials|' + row.account_id + '|LOMADEE')
  );
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(row.nonce) },
    key,
    fromB64(row.credentials_enc)
  );
  const credentials = JSON.parse(new TextDecoder().decode(plain));
  return String(credentials.apiKey || '').trim();
}

async function fingerprint(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return hex(digest);
}

export default async function handler(req, res) {
  let secret = '';
  try { secret = String(await config.get('EXTERNAL_WORKER_SECRET') || ''); } catch {}
  if (secret.length < 32) {
    return res.status(503).json({ error: 'Worker externo ainda não foi configurado no cofre da Hatchable.' });
  }

  const timestamp = String(req.headers['x-rpb-timestamp'] || '');
  const signature = String(req.headers['x-rpb-signature'] || '').replace(/^sha256=/, '');
  const rawBody = String(req.rawBody || '');
  if (!/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature) || !rawBody) {
    return res.status(400).json({ error: 'Assinatura do worker ausente ou inválida.' });
  }
  if (new TextEncoder().encode(rawBody).length > 750000) {
    return res.status(413).json({ error: 'Lote de descoberta excede o tamanho permitido.' });
  }

  let verified = false;
  try {
    verified = await webhooks.verifyHmac({
      raw: timestamp + '.' + rawBody,
      signature,
      secret,
      algorithm: 'sha256',
      encoding: 'hex',
      timestamp,
      tolerance: 300
    });
  } catch {}
  if (!verified) return res.status(401).json({ error: 'Assinatura do worker inválida ou expirada.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const pages = Array.isArray(body.pages) ? body.pages : [];
  const items = Array.isArray(body.items) ? body.items : [];
  if (body.operation !== 'external_worker_products' || !pages.length || pages.length > 5 ||
      pages.some(page => !Number.isInteger(page) || page < 1 || page > 25) ||
      new Set(pages).size !== pages.length || items.length > 12) {
    return res.status(400).json({ error: 'Lote de descoberta Lomadee inválido.' });
  }
  if (items.some(item => !item || typeof item !== 'object' || Array.isArray(item) ||
      !String(item.id || '').trim() || !String(item.organizationId || '').trim() ||
      !/^https:\/\//i.test(String(item.url || '')) || !Array.isArray(item.options))) {
    return res.status(400).json({ error: 'O lote contém produto sem identificador ou dados mínimos válidos.' });
  }
  if (!/^[a-f0-9]{64}$/i.test(String(body.apiKeyFingerprint || ''))) {
    return res.status(400).json({ error: 'Identificador da credencial Lomadee ausente.' });
  }

  try {
    const rows = (await db.query(
      "SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='LOMADEE' AND status='VALIDATED' ORDER BY account_id LIMIT 2"
    )).rows;
    if (!rows.length) return res.status(412).json({ error: 'Não existe credencial Lomadee validada no Radar.' });
    if (rows.length !== 1) return res.status(409).json({ error: 'Worker piloto exige uma única conta Lomadee validada.' });

    const apiKey = await storedLomadeeApiKey(rows[0]);
    if (!apiKey || await fingerprint(apiKey) !== String(body.apiKeyFingerprint).toLowerCase()) {
      return res.status(403).json({ error: 'A chave configurada no GitHub não corresponde à credencial Lomadee validada no Radar.' });
    }

    const result = await persistDiscoveryPage(db, {
      accountId: rows[0].account_id,
      marketplace: 'LOMADEE',
      operation: 'external_worker_products',
      kind: 'PRODUCT',
      items,
      cursorIn: pages.join(','),
      cursorOut: new Date().toISOString()
    });
    return res.json({ ok: true, sideEffects: false, marketplace: 'LOMADEE', pagesReceived: pages, ...result });
  } catch (error) {
    console.error('external Lomadee discovery ingest failed', String(error?.code || error?.name || 'ERROR').slice(0, 80));
    return res.status(500).json({ error: 'Não foi possível registrar a descoberta externa da Lomadee.' });
  }
}