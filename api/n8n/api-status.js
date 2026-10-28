import { config, db } from 'hatchable';
import { withIntegrationHealth } from 'lib/integration-health.js';

export const access = 'member';
export const methods = ['POST'];

const BASE_URL = 'https://radar-n8n.duckdns.org';

async function handler(req, res) {
  if (!req.member) return res.status(401).json({ ok: false, status: 'UNAUTHENTICATED', error: 'Entre no Radar Promo Brasil para testar a API do n8n.' });
  try {
    const key = String(await config.get('N8N_API_KEY') || '').trim();
    if (!key) return res.status(412).json({ ok: false, status: 'NOT_CONFIGURED', error: 'Configure N8N_API_KEY no cofre de segredos do projeto.' });

    // Safe read-only probe: request at most one workflow record and never execute a workflow.
    const response = await fetch(BASE_URL + '/api/v1/workflows?limit=1', {
      method: 'GET',
      headers: { 'X-N8N-API-KEY': key, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
      redirect: 'error'
    });

    if (response.status === 401 || response.status === 403) {
      return res.status(502).json({ ok: false, status: 'INVALID_CREDENTIALS', upstreamStatus: response.status, error: 'O n8n recusou a chave da API. Confira a chave em Settings > n8n API.' });
    }
    if (!response.ok) {
      return res.status(502).json({ ok: false, status: 'UPSTREAM_ERROR', upstreamStatus: response.status, error: 'A API REST do n8n respondeu com erro; nenhum workflow foi executado.' });
    }

    const payload = await response.json();
    return res.json({
      ok: true,
      status: 'CONNECTED',
      service: 'n8n REST API',
      endpoint: BASE_URL + '/api/v1/workflows?limit=1',
      check: 'read_only',
      accessible: true,
      workflowRecordsReturned: Array.isArray(payload.data) ? payload.data.length : 0,
      message: 'Chave validada com consulta somente de leitura. Nenhum workflow foi executado.'
    });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return res.status(502).json({ ok: false, status: timeout ? 'TIMEOUT' : 'CONNECTION_ERROR', error: timeout ? 'Tempo limite ao consultar a API do n8n.' : 'Não foi possível consultar a API REST do n8n. Verifique a conectividade da instância.' });
  }
}

export default async function(req, res) { return withIntegrationHealth(req, res, db, 'n8n_api', handler); }
