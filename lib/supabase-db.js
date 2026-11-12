import { config } from 'hatchable';

const encoder = new TextEncoder();
let settingsPromise;

async function bridgeSettings() {
  if (!settingsPromise) {
    settingsPromise = Promise.all([
      config.get('supabase_db_bridge_url'),
      config.get('SUPABASE_DB_BRIDGE_SECRET')
    ]).then(([url, secret]) => {
      const settings = {
        url: String(url || '').trim(),
        secret: String(secret || '').trim()
      };
      // Do not cache an unconfigured state: secrets may be added after the first health check.
      if (!settings.url || settings.secret.length < 32) settingsPromise = null;
      return settings;
    }).catch(error => {
      settingsPromise = null;
      throw error;
    });
  }
  return settingsPromise;
}

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function signedHeaders(body, secret) {
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(timestamp + '.' + nonce + '.' + body)
  );
  return {
    'content-type': 'application/json',
    'x-radar-timestamp': timestamp,
    'x-radar-nonce': nonce,
    'x-radar-signature': toHex(signature)
  };
}

async function send(payload) {
  const { url, secret } = await bridgeSettings();
  if (!url || secret.length < 32) {
    const error = new Error('Conexão Supabase ainda não configurada no cofre do Hatchable.');
    error.code = 'SUPABASE_BRIDGE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const body = JSON.stringify(payload);
  const headers = await signedHeaders(body, secret);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30000)
    });
  } catch {
    const error = new Error('Não foi possível alcançar a ponte privada do Supabase.');
    error.code = 'SUPABASE_BRIDGE_UNREACHABLE';
    error.status = 503;
    throw error;
  }

  let result = {};
  try { result = await response.json(); } catch {}
  if (!response.ok || result?.ok === false) {
    const error = new Error(String(result?.error || 'Falha na consulta ao banco Supabase.'));
    error.code = String(result?.error || 'SUPABASE_DATABASE_ERROR');
    error.status = response.status || 503;
    error.requestId = result?.requestId || null;
    throw error;
  }
  return result;
}

export const db = Object.freeze({
  query(sql, params = []) {
    return send({ operation: 'query', sql: String(sql), params: Array.isArray(params) ? params : [] });
  },
  transaction(operations = []) {
    return send({
      operation: 'transaction',
      operations: Array.isArray(operations) ? operations : []
    });
  }
});