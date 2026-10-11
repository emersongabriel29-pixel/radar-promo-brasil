import { config, db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST'];

const BASES = {
  contents: 'https://dashboard-api.lomadee.com.br',
  commissions: 'https://commissions.lomadee.com.br',
  orders: 'https://orders.lomadee.com.br'
};
const clean = (value, max = 100) => String(value ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function getAccount(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
async function getCredentials(accountId) {
  const row = (await db.query(
    "SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='LOMADEE' LIMIT 1",
    [accountId]
  )).rows[0];
  if (!row) return null;
  const raw = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (raw.length < 32) throw Object.assign(new Error('A chave de criptografia do conector não está configurada.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + '|radar-marketplace-credentials|' + accountId + '|LOMADEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  const credentials = JSON.parse(new TextDecoder().decode(plain));
  return { credentials, status: row.status };
}
async function apiRequest(resource, apiKey, params = {}) {
  const url = new URL(BASES[resource] + ({ contents: '/api/contents', commissions: '/api/commissions', orders: '/api/orders' })[resource]);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'x-auth-key': apiKey, 'accept': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  if (!response.ok) {
    const error = Object.assign(new Error('A API oficial da Lomadee respondeu HTTP ' + response.status + '.'), { status: response.status });
    throw error;
  }
  return body;
}
function listFrom(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}
function safeRows(resource, body) {
  const rows = listFrom(body);
  if (resource === 'contents') return rows.map(x => ({
    id: clean(x.id, 120), title: clean(x.title, 300), type: clean(x.type, 40),
    status: clean(x.status, 40), highlighted: Boolean(x.highlighted),
    url: typeof x.url === 'string' && /^https:\/\//i.test(x.url) ? x.url.slice(0, 2000) : '',
    updatedAt: clean(x.updatedAt, 50)
  }));
  if (resource === 'commissions') return rows.map(x => ({
    id: clean(x.id, 120), name: clean(x.name, 300), type: clean(x.type, 40),
    value: Number.isFinite(Number(x.value)) ? Number(x.value) : null,
    active: Boolean(x.active), startAt: clean(x.startAt, 50), endAt: clean(x.endAt, 50)
  }));
  return rows.map(x => ({
    id: clean(x.id || x.orderId, 120), status: clean(x.status, 40),
    value: Number.isFinite(Number(x.value)) ? Number(x.value) : null,
    createdAt: clean(x.createdAt, 50), updatedAt: clean(x.updatedAt, 50)
  }));
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Lomadee.' });
  try {
    const account = await getAccount(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    const saved = await getCredentials(account.id);
    if (!saved) return res.status(412).json({ error: 'Cadastre a chave de autenticação da API Lomadee antes de testar.' });
    const apiKey = clean(saved.credentials.apiKey, 4096);
    if (!apiKey) return res.status(412).json({ error: 'A credencial salva não contém a chave de autenticação da API Lomadee.' });

    if (req.method === 'POST') {
      if (clean(req.body?.action, 40) !== 'validate') return res.status(400).json({ error: 'Ação não suportada.' });
      try {
        await apiRequest('contents', apiKey, { page: 1, limit: 1 });
        await db.query(
          "UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'",
          [account.id]
        );
        return res.json({
          ok: true, status: 'VALIDATED',
          capabilities: ['contents', 'commissions', 'orders'],
          note: 'A chave autenticou uma consulta de leitura à API oficial. A geração de links de afiliado e a descoberta de produtos não são expostas pelo SDK oficial verificado e permanecem pelo fluxo do portal.'
        });
      } catch (error) {
        const code = Number(error?.status) || 0;
        await db.query(
          "UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'",
          [account.id, code ? 'Falha de autenticação/permissão na API oficial (HTTP ' + code + ').' : 'Falha de conexão ou tempo limite na API oficial.']
        );
        return res.status(code === 401 || code === 403 ? 502 : 502).json({
          error: code ? 'A Lomadee recusou a consulta de teste (HTTP ' + code + '). Confira a chave e as permissões no portal.' : 'Não foi possível alcançar a API oficial da Lomadee dentro do limite de tempo.',
          status: 'ERROR'
        });
      }
    }

    if (req.method === 'GET') {
      const resource = clean(req.query?.resource || 'status', 40).toLowerCase();
      if (resource === 'status') return res.json({
        status: saved.status, capabilities: ['contents', 'commissions', 'orders'],
        unsupported: ['product_discovery', 'affiliate_deeplink_generation'],
        note: 'Os recursos disponíveis dependem das permissões da chave da conta.'
      });
      if (!['contents', 'commissions', 'orders'].includes(resource)) return res.status(400).json({ error: 'Recurso somente leitura não suportado.' });
      const limit = Math.min(20, Math.max(1, Math.floor(Number(req.query?.limit) || 10)));
      const body = await apiRequest(resource, apiKey, { page: 1, limit });
      const rows = safeRows(resource, body);
      return res.json({ resource, items: rows, count: rows.length, readOnly: true });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('integrations/lomadee', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(500).json({ error: 'Não foi possível acessar a integração Lomadee.' });
  }
}