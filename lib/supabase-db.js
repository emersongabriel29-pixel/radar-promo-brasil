import { config } from 'hatchable';

const encoder = new TextEncoder();
const SETTINGS_CACHE_MS = 5000;
let settingsPromise;
let cachedSettings;
let settingsExpireAt = 0;

function validBridgeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

async function bridgeSettings() {
  if (cachedSettings && Date.now() < settingsExpireAt) return cachedSettings;
  if (!settingsPromise) {
    settingsPromise = Promise.all([
      config.get('supabase_db_bridge_url'),
      config.get('SUPABASE_DB_BRIDGE_SECRET')
    ]).then(([url, secret]) => {
      const settings = {
        url: String(url || '').trim(),
        secret: String(secret || '').trim()
      };
      // Invalid settings must be recoverable immediately; valid settings have a bounded TTL.
      cachedSettings = validBridgeUrl(settings.url) && settings.secret.length >= 32 ? settings : null;
      settingsExpireAt = cachedSettings ? Date.now() + SETTINGS_CACHE_MS : 0;
      return settings;
    }).finally(() => {
      settingsPromise = null;
    });
  }
  return settingsPromise;
}

function invalidResponse() {
  return Object.assign(new Error('A ponte Supabase retornou uma resposta inválida.'), {
    code: 'SUPABASE_BRIDGE_INVALID_RESPONSE', status: 502
  });
}

function validQueryResult(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Array.isArray(value.rows) && value.rows.every(row => row !== null && typeof row === 'object' && !Array.isArray(row)) &&
    Number.isSafeInteger(value.rowCount) && value.rowCount >= 0;
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
  if (!validBridgeUrl(url)) {
    throw Object.assign(new Error('Configure uma URL HTTPS válida para a ponte Supabase.'), {
      code: 'SUPABASE_BRIDGE_INVALID_URL', status: 503
    });
  }

  const body = JSON.stringify(payload);
  const headers = await signedHeaders(body, secret);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(30000)
    });
  } catch {
    const error = new Error('Não foi possível alcançar a ponte privada do Supabase.');
    error.code = 'SUPABASE_BRIDGE_UNREACHABLE';
    error.status = 503;
    throw error;
  }

  let result;
  try { result = await response.json(); } catch {}
  if (!response.ok || result?.ok === false) {
    const error = new Error('Falha na consulta ao banco Supabase.');
    error.code = typeof result?.error === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(result.error)
      ? result.error : 'SUPABASE_DATABASE_ERROR';
    error.status = response.status >= 400 && response.status <= 599 ? response.status : 502;
    error.requestId = typeof result?.requestId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(result.requestId)
      ? result.requestId : null;
    throw error;
  }
  if (!result || Array.isArray(result) || result.ok !== true) throw invalidResponse();
  if (payload.operation === 'query' && !validQueryResult(result)) throw invalidResponse();
  if (payload.operation === 'transaction' && (
    !Array.isArray(result.results) || result.results.length !== payload.operations.length ||
    !result.results.every(validQueryResult)
  )) throw invalidResponse();
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
