import { db } from 'hatchable';
import { magaluToken } from 'lib/direct-connectors.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

async function accountFor(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para consultar a conexão Magalu.' });
  try {
    const account = await accountFor(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    const row = (await db.query("SELECT status,expires_at AS \"expiresAt\",updated_at AS \"updatedAt\",last_error AS \"lastError\" FROM marketplace_connections WHERE account_id=$1 AND marketplace='MAGALU' LIMIT 1", [account.id])).rows[0] || null;
    if (req.method === 'GET') {
      return res.json({
        provider: 'MAGALU',
        status: row?.status || 'NOT_CONNECTED',
        expiresAt: row?.expiresAt || null,
        updatedAt: row?.updatedAt || null,
        lastError: row?.lastError || '',
        credentialValuesExposed: false,
        documentation: 'https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html'
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (String(req.body?.action || 'test') !== 'test') return res.status(400).json({ error: 'Ação inválida. Use test.' });
    const token = await magaluToken(account.id, { forceRefresh: true });
    const response = await fetch('https://api.magalu.com/seller/v1/portfolios/skus', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = response.status === 403
        ? 'OAuth renovado, mas a API de SKUs recusou o acesso (403). Confira os escopos open:portfolio-skus-seller:read e a autorização do seller.'
        : response.status === 401
          ? 'OAuth renovado, mas a API de SKUs não aceitou o token (401). Reconecte a conta no ID Magalu.'
          : 'A API oficial de SKUs respondeu HTTP ' + response.status + '.';
      await db.query("UPDATE marketplace_connections SET last_error=$1,updated_at=now() WHERE account_id=$2 AND marketplace='MAGALU'", [message, account.id]);
      return res.status(response.status === 401 || response.status === 403 ? 502 : response.status).json({ provider: 'MAGALU', status: 'API_TEST_FAILED', oauthRefresh: 'SUCCESS', httpStatus: response.status, error: message, publicationEnabled: false });
    }
    const results = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : Array.isArray(data.data) ? data.data : [];
    await db.query("UPDATE marketplace_connections SET status='ACTIVE',last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='MAGALU'", [account.id]);
    return res.json({
      provider: 'MAGALU',
      status: 'VALIDATED',
      oauthRefresh: 'SUCCESS',
      apiEndpoint: '/seller/v1/portfolios/skus',
      httpStatus: response.status,
      sampleCount: results.length,
      readOnly: true,
      publicationEnabled: false,
      note: 'OAuth renovado e consulta oficial de SKUs concluída. Isto valida a API seller, não a API do programa Parceiro Magalu nem rastreamento de comissão.'
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({
      provider: 'MAGALU',
      status: error?.code === 'MAGALU_NOT_CONNECTED' ? 'NOT_CONNECTED' : 'ERROR',
      error: error?.message || 'Não foi possível validar a conexão Magalu.',
      publicationEnabled: false
    });
  }
}