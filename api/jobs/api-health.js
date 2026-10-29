import { db, config } from 'hatchable';

export const access = 'scheduler';
export const methods = ['POST'];
const BASE = 'https://radar-n8n.duckdns.org';
const MCP = BASE + '/mcp-server/http';
const VERSION = '2025-03-26';

async function save(name, status, details) {
  await db.query(
    `INSERT INTO integration_health(name,status,details,last_checked_at,updated_at)
     VALUES($1,$2,$3,now(),now())
     ON CONFLICT(name) DO UPDATE SET status=EXCLUDED.status,details=EXCLUDED.details,last_checked_at=now(),updated_at=now()`,
    [name, status, String(details || '').slice(0, 500)]
  );
}
async function mcpPayload(response) {
  const raw = await response.text();
  if (!response.ok) throw new Error('MCP HTTP ' + response.status);
  if (!raw.trim()) return null;
  const type = String(response.headers.get('content-type') || '');
  if (type.includes('text/event-stream')) {
    const lines = raw.split(/\r?\n/).filter(x => x.startsWith('data:')).map(x => x.slice(5).trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) { try { return JSON.parse(lines[i]); } catch {} }
    throw new Error('Resposta SSE inválida');
  }
  return JSON.parse(raw);
}
async function mcpRpc(token, method, id, params, session, version) {
  const headers = {
    authorization: 'Bearer ' + token,
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'mcp-protocol-version': version || VERSION
  };
  if (session) headers['mcp-session-id'] = session;
  const response = await fetch(MCP, {
    method: 'POST', headers,
    body: JSON.stringify({jsonrpc:'2.0', id, method, params}),
    signal: AbortSignal.timeout(10000)
  });
  return {response, data: await mcpPayload(response)};
}
export default async function(req, res) {
  const results = [];
  const key = String(await config.get('N8N_API_KEY') || '').trim();
  if (!key) {
    await save('n8n_api_rest', 'NOT_CONFIGURED', 'N8N_API_KEY não está configurada no cofre de segredos.');
    results.push({name:'n8n_api_rest',status:'NOT_CONFIGURED'});
  } else {
    try {
      const response = await fetch(BASE + '/api/v1/workflows?limit=1', {
        method:'GET', headers:{'X-N8N-API-KEY':key,accept:'application/json'},
        signal:AbortSignal.timeout(10000), redirect:'error'
      });
      if (!response.ok) throw new Error('API REST HTTP ' + response.status);
      const body = await response.json();
      const detail = 'Consulta de leitura concluída; registros retornados: ' + (Array.isArray(body.data) ? body.data.length : 0) + '. Nenhum workflow executado.';
      await save('n8n_api_rest','CONNECTED',detail);
      results.push({name:'n8n_api_rest',status:'CONNECTED'});
    } catch (e) {
      const detail = String(e && e.message || 'Falha na consulta REST').slice(0,180);
      await save('n8n_api_rest','ERROR',detail);
      results.push({name:'n8n_api_rest',status:'ERROR',error:detail});
    }
  }

  const token = String(await config.get('N8N_MCP_ACCESS_TOKEN') || '').trim();
  if (!token) {
    await save('n8n_mcp', 'NOT_CONFIGURED', 'N8N_MCP_ACCESS_TOKEN não está configurado para o monitoramento automático.');
    results.push({name:'n8n_mcp',status:'NOT_CONFIGURED'});
  } else {
    try {
      const init = await mcpRpc(token,'initialize',1,{protocolVersion:VERSION,capabilities:{},clientInfo:{name:'radar-health-monitor',version:'1.0.0'}},'',VERSION);
      if (init.data && init.data.error) throw new Error('Handshake MCP recusado');
      if (!init.data || !init.data.result) throw new Error('Handshake MCP sem confirmação');
      const session = init.response.headers.get('mcp-session-id') || '';
      const version = String(init.data.result.protocolVersion || VERSION);
      const headers = {authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json, text/event-stream','mcp-protocol-version':version};
      if (session) headers['mcp-session-id'] = session;
      const notice = await fetch(MCP,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),signal:AbortSignal.timeout(10000)});
      if (!notice.ok && notice.status !== 202) throw new Error('Finalização do handshake HTTP '+notice.status);
      const listed = await mcpRpc(token,'tools/list',2,{},session,version);
      if (listed.data && listed.data.error) throw new Error('Falha em tools/list');
      const count = Array.isArray(listed.data && listed.data.result && listed.data.result.tools) ? listed.data.result.tools.length : 0;
      await save('n8n_mcp','CONNECTED','Handshake e tools/list concluídos; '+count+' ferramentas disponíveis. Nenhuma ferramenta remota executada.');
      results.push({name:'n8n_mcp',status:'CONNECTED',toolCount:count});
    } catch (e) {
      const detail = String(e && e.message || 'Falha no teste MCP').slice(0,180);
      await save('n8n_mcp','ERROR',detail);
      results.push({name:'n8n_mcp',status:'ERROR',error:detail});
    }
  }
  const errors = results.filter(x => x.status === 'ERROR').length;
  return res.json({ok:errors===0, checkedAt:new Date().toISOString(), interval:'every 30 minutes', results, alert:errors ? 'Falha detectada em uma ou mais conexões críticas.' : 'Nenhuma falha crítica detectada.'});
}