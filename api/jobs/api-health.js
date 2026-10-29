import { config, db } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];

const REST_BASE = 'https://radar-n8n.duckdns.org';
const MCP_ENDPOINT = 'https://radar-n8n.duckdns.org/mcp-server/http';
const MCP_VERSION = '2025-03-26';

async function checkRest() {
  const key = String(await config.get('N8N_API_KEY') || '').trim();
  if (!key) return { status: 'NOT_CONFIGURED', details: 'N8N_API_KEY não configurada; nenhuma chamada externa foi feita.' };
  try {
    const response = await fetch(REST_BASE + '/api/v1/workflows?limit=1', {
      method: 'GET',
      headers: { 'X-N8N-API-KEY': key, accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
      redirect: 'error'
    });
    if (!response.ok) return { status: 'ERROR', details: 'A API REST do n8n respondeu HTTP ' + response.status + '; nenhum workflow foi executado.' };
    return { status: 'CONNECTED', details: 'Consulta autenticada de leitura concluída; nenhum workflow foi executado.' };
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return { status: 'ERROR', details: timeout ? 'Tempo limite ao consultar a API REST do n8n.' : 'Falha de conexão ao consultar a API REST do n8n.' };
  }
}

async function readMcpPayload(response) {
  const raw = await response.text();
  if (!response.ok) throw new Error('HTTP ' + response.status);
  if (!raw.trim()) return null;
  if (String(response.headers.get('content-type') || '').includes('text/event-stream')) {
    const lines = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try { return JSON.parse(lines[i]); } catch {}
    }
    throw new Error('Resposta SSE inválida');
  }
  return JSON.parse(raw);
}

async function mcpRpc(token, method, id, params, session, version) {
  const headers = {
    authorization: 'Bearer ' + token,
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'mcp-protocol-version': version || MCP_VERSION
  };
  if (session) headers['mcp-session-id'] = session;
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    signal: AbortSignal.timeout(10000),
    redirect: 'error'
  });
  return { response, data: await readMcpPayload(response) };
}

async function checkMcp() {
  const token = String(await config.get('N8N_MCP_ACCESS_TOKEN') || '').trim();
  if (!token) return { status: 'NOT_CONFIGURED', details: 'N8N_MCP_ACCESS_TOKEN não configurado. Conexões OAuth por conta precisam ser validadas manualmente; o monitor não renova tokens.' };
  try {
    const init = await mcpRpc(token, 'initialize', 1, {
      protocolVersion: MCP_VERSION,
      capabilities: {},
      clientInfo: { name: 'radar-promo-brasil-health-check', version: '1.0.0' }
    }, '', MCP_VERSION);
    if (init.data?.error || !init.data?.result) throw new Error('Handshake MCP não confirmado');
    const session = init.response.headers.get('mcp-session-id') || '';
    const version = String(init.data.result.protocolVersion || MCP_VERSION);
    const headers = {
      authorization: 'Bearer ' + token,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': version
    };
    if (session) headers['mcp-session-id'] = session;
    const notice = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error'
    });
    if (!notice.ok && notice.status !== 202) throw new Error('Handshake MCP HTTP ' + notice.status);
    const listed = await mcpRpc(token, 'tools/list', 2, {}, session, version);
    if (listed.data?.error || !listed.data?.result) throw new Error('tools/list MCP não confirmado');
    const count = Array.isArray(listed.data.result.tools) ? listed.data.result.tools.length : 0;
    return { status: 'CONNECTED', details: 'Handshake MCP e tools/list concluídos (' + count + ' ferramentas); nenhuma ferramenta remota foi executada.' };
  } catch (error) {
    const message = String(error?.message || '');
    return { status: 'ERROR', details: message.startsWith('HTTP ') ? 'O endpoint MCP respondeu ' + message + '.' : 'Falha no handshake ou na listagem de ferramentas MCP; nenhuma ferramenta remota foi executada.' };
  }
}

export default async function handler(req, res) {
  const accounts = (await db.query("SELECT id FROM accounts WHERE status='ACTIVE'")).rows;
  const [rest, mcp] = await Promise.all([checkRest(), checkMcp()]);
  let written = 0;
  for (const account of accounts) {
    let accountMcp = mcp;
    if (!String(await config.get('N8N_MCP_ACCESS_TOKEN') || '').trim()) {
      const oauth = (await db.query(
        "SELECT id FROM marketplace_connections WHERE account_id=$1 AND marketplace='N8N_MCP' AND status='ACTIVE' LIMIT 1",
        [account.id]
      )).rows[0];
      if (oauth) accountMcp = { status: 'PENDING_VALIDATION', details: 'Conexão OAuth registrada. O monitor agendado não renova nem testa tokens por conta; execute o teste MCP manual.' };
    }
    for (const [name, result] of [['n8n_api_rest', rest], ['n8n_mcp', accountMcp]]) {
      await db.query(
        'INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(account_id,name) DO UPDATE SET status=EXCLUDED.status,details=EXCLUDED.details,last_checked_at=now()',
        [account.id, name, result.status, result.details.slice(0, 240)]
      );
      written++;
    }
  }
  return res.json({ ok: true, accounts: accounts.length, checksWritten: written, checked: { n8n_api_rest: rest.status, n8n_mcp: mcp.status }, note: 'Monitoramento somente leitura; nenhum workflow ou ferramenta MCP foi executado.' });
}
