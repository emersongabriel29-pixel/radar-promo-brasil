import { config, db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST', 'DELETE'];

const STORES = {
  MERCADOLIVRE: { name: 'Mercado Livre · OAuth de conta', portalUrl: 'https://developers.mercadolivre.com.br/', authModel: 'OAuth 2.0 Authorization Code com PKCE. A autorização da conta é separada do programa de afiliados; o Radar não deve inferir aprovação de afiliado apenas pela conexão OAuth.' },
  AWIN: { name: 'Awin Afiliados · Publisher API e Product Feed', portalUrl: 'https://help.awin.com/apidocs/introduction-1', authModel: 'Token Bearer da API Awin e Publisher ID numérico. Feed de produtos disponível conforme anunciante, locale e permissões.' },
  RAKUTEN: { name: 'Rakuten Advertising · Product Search e Deep Links', portalUrl: 'https://developers.rakutenadvertising.com/', authModel: 'Token Bearer gerado no Developer Portal. O token normalmente dura 60 minutos; parcerias e permissão de deep link dependem do anunciante.' },
  ADMITAD: { name: 'Admitad · campanhas e deeplinks', portalUrl: 'https://developers.mitgo.com/hc/en-us/articles/34481290690834-Introduction', authModel: 'Client ID, Client Secret e Website ID. O Radar obtém e renova o token via OAuth; os escopos advcampaigns, advcampaigns_for_website, deeplink_generator e websites precisam estar autorizados.' },
  AMAZON: { name: 'Amazon Associados · Creators API', portalUrl: 'https://associados.amazon.com.br/creatorsapi/docs/en-us/onboarding/register-for-creators-api', authModel: 'Creators API: Credential ID, Credential Secret, versão da credencial e Partner Tag da conta de Associado.' },
  SHOPEE: { name: 'Shopee Afiliados', portalUrl: 'https://affiliate.shopee.com.br/', authModel: 'App ID e App Secret da Open API de Afiliados; solicite habilitação à Shopee se ainda não tiver acesso.' },
  ALIEXPRESS: { name: 'AliExpress Afiliados · Open Platform (legada)', portalUrl: 'https://portals.aliexpress.com/', authModel: 'App Key, App Secret, Tracking ID e, se exigida, App Signature. Atenção: a documentação pública dos métodos Affiliate API está marcada como descontinuada; só teste se o portal ainda habilitar essa API para sua conta.' },
  SHEIN: { name: 'SHEIN Afiliados · importação de links oficiais', portalUrl: 'https://onelink.shein.com/3/3usk7i1vyedb', authModel: 'A nova plataforma brasileira gera links de produtos e campanhas no Centro de Afiliados. Não foi identificada uma API pública de afiliados para geração automática; importe os links gerados pela sua conta.' },
  MAGALU: { name: 'Magalu · API Key credentials', portalUrl: 'https://developers.magalu.com/docs/', authModel: 'Use exatamente os três campos fornecidos pelo seu portal Magalu: API Key, API Key ID e API Key Secret. Este formulário apenas armazena as credenciais de forma criptografada; a autenticação e as chamadas oficiais precisam ser confirmadas conforme o produto Magalu habilitado na conta. Links do Parceiro Magalu são um fluxo separado.' },
  CASAS_BAHIA: { name: 'Casas Bahia', portalUrl: 'https://www.casasbahia.com.br/', authModel: 'Credenciais do programa/rede de afiliados contratada, quando houver API.' },
  HOTMART: { name: 'Hotmart', portalUrl: 'https://app.hotmart.com/', authModel: 'Credenciais oficiais da API Hotmart, se necessárias ao fluxo.' },
  KABUM: { name: 'KaBuM!', portalUrl: 'https://www.kabum.com.br/', authModel: 'Identificação/token fornecido pelo programa ou rede de afiliados.' },
  AMERICANAS: { name: 'Americanas', portalUrl: 'https://www.americanas.com.br/', authModel: 'Credenciais do programa/rede de afiliados contratada, quando houver API.' },
  LOMADEE: { name: 'Lomadee', portalUrl: 'https://www.lomadee.com.br/pt-br/afiliados', authModel: 'Chave de autenticação da API oficial no cabeçalho x-auth-key, conforme SDK pública @thelomadee/sdk.' }
};
const ALLOWED_FIELDS = ['affiliateId','appId','apiKey','apiKeyId','apiKeySecret','apiSecret','clientId','clientSecret','accessToken','trackingId','accountId','version','marketplace','appSignature','legacyApiAcknowledged','extra'];
const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

async function getAccount(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
async function encryptionKey(accountId, marketplace) {
  const raw = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (raw.length < 32) throw Object.assign(new Error('Configure CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + '|radar-marketplace-credentials|' + accountId + '|' + marketplace));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encryptCredentials(accountId, marketplace, value) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(accountId, marketplace);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { nonce: toB64(nonce), encrypted: toB64(ciphertext) };
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para configurar as integrações.' });
  try {
    const account = await getAccount(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });

    if (req.method === 'GET') {
      const rows = (await db.query(
        'SELECT marketplace,status,credential_fields AS "credentialFields",key_last4 AS "keyLast4",last_checked_at AS "lastCheckedAt",last_error AS "lastError",updated_at AS "updatedAt" FROM marketplace_api_credentials WHERE account_id=$1 ORDER BY marketplace',
        [account.id]
      )).rows;
      const configured = new Map(rows.map(row => [row.marketplace, row]));
      const connections = (await db.query("SELECT marketplace,status,updated_at AS \"updatedAt\",last_error AS \"lastError\" FROM marketplace_connections WHERE account_id=$1 AND marketplace IN ('MAGALU','MERCADOLIVRE')", [account.id])).rows;
      const connectedById = new Map(connections.map(connection => [connection.marketplace, connection]));
      return res.json({
        items: Object.entries(STORES).map(([id, store]) => {
          const row = configured.get(id);
          const connectionId = id === 'MAGALU' ? 'MAGALU' : id === 'MERCADOLIVRE' ? 'MERCADOLIVRE' : '';
          const connection = connectionId ? connectedById.get(connectionId) : null;
          const connected = connection?.status === 'ACTIVE';
          return { id, ...store, status: connected ? 'CONNECTED' : (row?.status || 'NOT_CONFIGURED'), credentialFields: row?.credentialFields || [], keyLast4: row?.keyLast4 || '', lastCheckedAt: connected ? connection.updatedAt : (row?.lastCheckedAt || null), lastError: connected ? (connection.lastError || '') : (row?.lastError || ''), updatedAt: connected ? connection.updatedAt : (row?.updatedAt || null) };
        }),
        note: 'Salvar credenciais não equivale a validar a API. O estado só muda para VALIDATED depois de uma verificação oficial implementada e aprovada.'
      });
    }

    const body = req.body || {};
    const marketplace = clean(body.marketplace, 40).toUpperCase();
    if (!STORES[marketplace]) return res.status(400).json({ error: 'Loja não suportada por este fluxo.' });

    if (req.method === 'DELETE') {
      const result = await db.query('DELETE FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace=$2 RETURNING marketplace', [account.id, marketplace]);
      return res.json({ ok: true, deleted: result.rows.length > 0, marketplace });
    }

    if (req.method === 'POST') {
      const input = body.credentials && typeof body.credentials === 'object' && !Array.isArray(body.credentials) ? body.credentials : {};
      const credentials = {};
      for (const field of ALLOWED_FIELDS) {
        const value = clean(input[field], 4096);
        if (value) credentials[field] = value;
      }
      if (!Object.keys(credentials).length) return res.status(400).json({ error: 'Informe ao menos uma credencial oficial ou identificação de afiliado.' });
      if (Object.values(credentials).some(value => value.length > 4096)) return res.status(400).json({ error: 'Uma credencial excede o limite permitido.' });
      const secret = credentials.apiKeySecret || credentials.apiSecret || credentials.clientSecret || credentials.accessToken || credentials.apiKey || '';
      const hint = secret ? secret.slice(-4) : String(credentials.appId || credentials.affiliateId || credentials.clientId || credentials.trackingId || '').slice(-4);
      const sealed = await encryptCredentials(account.id, marketplace, credentials);
      const fields = Object.keys(credentials);
      await db.query(
        "INSERT INTO marketplace_api_credentials(id,account_id,marketplace,credentials_enc,nonce,credential_fields,key_last4,status,last_checked_at,last_error) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,'PENDING_VALIDATION',NULL,'') ON CONFLICT(account_id,marketplace) DO UPDATE SET credentials_enc=EXCLUDED.credentials_enc,nonce=EXCLUDED.nonce,credential_fields=EXCLUDED.credential_fields,key_last4=EXCLUDED.key_last4,status='PENDING_VALIDATION',last_checked_at=NULL,last_error='',updated_at=now()",
        [crypto.randomUUID(), account.id, marketplace, sealed.encrypted, sealed.nonce, JSON.stringify(fields), hint]
      );
      return res.json({ ok: true, marketplace, status: 'PENDING_VALIDATION', credentialFields: fields, keyLast4: hint, message: 'Credenciais recebidas e criptografadas. A conexão continua pendente até a validação oficial da API; nenhuma oferta foi publicada.' });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('integrations/marketplaces', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(500).json({ error: 'Não foi possível salvar ou consultar as credenciais da loja.' });
  }
}