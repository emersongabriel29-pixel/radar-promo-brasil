import { config, db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST'];

const BASE = 'https://api.awin.com';
const clean = (v, n = 300) => String(v ?? '').trim().slice(0, n);
const fromB64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));

async function accountFor(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}
async function credentialsFor(accountId) {
  const row = (await db.query("SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='AWIN' LIMIT 1", [accountId])).rows[0];
  if (!row) return null;
  const master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw Object.assign(new Error('Configure CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|AWIN'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return { credentials: JSON.parse(new TextDecoder().decode(plain)), status: row.status };
}
function validate(c) {
  const token = clean(c.accessToken, 4096);
  const publisherId = clean(c.accountId || c.affiliateId, 30);
  if (!token || !/^\d{1,20}$/.test(publisherId)) {
    throw Object.assign(new Error('Cadastre o token API Bearer e o Publisher ID numérico da Awin.'), { status: 412 });
  }
  return { token, publisherId };
}
async function awinRequest(path, credentials, timeout = 12000) {
  const url = new URL(BASE + path);
  // Awin documents both the Bearer header and accessToken query parameter for publisher programme lookup.
  if (path.includes('/programmes')) url.searchParams.set('accessToken', credentials.token);
  const response = await fetch(url.toString(), {
    headers: { authorization: 'Bearer ' + credentials.token, accept: 'application/json' },
    signal: AbortSignal.timeout(timeout)
  });
  const raw = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error('A Awin recusou a consulta (HTTP ' + response.status + '). Confira token, Publisher ID e permissões do feed/programa.'), { status: response.status === 401 || response.status === 403 ? 502 : response.status >= 400 && response.status < 500 ? response.status : 502 });
  }
  return raw;
}
function normalizeFeed(raw, limit) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { items: [], count: 0, incomplete: false };
  let parsed = [];
  for (let i = 0; i < Math.min(lines.length, 500); i++) {
    let item;
    try { item = JSON.parse(lines[i]); } catch { continue; }
    if (item && item.error) throw Object.assign(new Error('O feed Awin terminou com erro: ' + clean(item.message || item.error, 120)), { status: 502 });
    parsed.push(item);
  }
  const items = parsed.slice(0, limit).map(x => {
    const basic = x.product_basic || x;
    const price = x.price || basic.price || null;
    const salePrice = x.sale_price || basic.sale_price || null;
    const link = x.link || basic.link || '';
    const image = x.image_link || basic.image_link || '';
    return {
      id: clean(x.id || basic.id, 100),
      title: clean(x.title || basic.title, 250),
      description: clean(x.description || basic.description, 500),
      productUrl: /^https:\/\//i.test(link) ? clean(link, 2000) : '',
      imageUrl: /^https:\/\//i.test(image) ? clean(image, 2000) : '',
      price: clean(salePrice || price, 80),
      availability: clean(x.availability || basic.availability, 40),
      brand: clean(x.brand || basic.brand, 120),
      currency: clean((salePrice || price || '').match(/[A-Z]{3}/)?.[0] || '', 3),
      advertiserId: clean(x.meta?.advertiser_id || '', 30),
      source: 'AWIN'
    };
  }).filter(x => x.title && x.productUrl);
  return { items, count: parsed.length, incomplete: lines.length >= 500, note: 'Feed somente leitura; os itens não foram salvos nem publicados.' };
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Awin.' });
  try {
    const account = await accountFor(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    const saved = await credentialsFor(account.id);
    if (req.method === 'GET') return res.json({
      provider: 'AWIN',
      status: saved?.status || 'NOT_CONFIGURED',
      capabilities: ['publisher_programmes', 'retail_product_feed_jsonl'],
      apiDocumentation: 'https://help.awin.com/apidocs/introduction-1',
      publicationEnabled: false,
      note: 'O token e o Publisher ID precisam ser emitidos pela Awin. Feed disponível apenas para anunciantes/idiomas autorizados na conta.'
    });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (!saved) return res.status(412).json({ error: 'Cadastre o token e o Publisher ID da Awin no painel.' });
    const c = validate(saved.credentials || {});
    const body = req.body || {};
    const action = clean(body.action || 'test', 30).toLowerCase();
    if (action === 'test' || action === 'programmes') {
      const relationship = action === 'test' ? 'joined' : clean(body.relationship || 'joined', 20).toLowerCase();
      if (!['joined','pending','suspended','rejected','notjoined'].includes(relationship)) return res.status(400).json({ error: 'Filtro de relacionamento inválido.' });
      const countryCode = clean(body.countryCode || 'BR', 2).toUpperCase();
      if (!/^[A-Z]{2}$/.test(countryCode)) return res.status(400).json({ error: 'Informe país ISO de duas letras.' });
      const raw = await awinRequest('/publishers/' + c.publisherId + '/programmes?relationship=' + encodeURIComponent(relationship) + '&countryCode=' + countryCode, c);
      let programmes;
      try { programmes = JSON.parse(raw); } catch { throw Object.assign(new Error('A Awin retornou um formato de programas inesperado.'), { status: 502 }); }
      if (!Array.isArray(programmes)) throw Object.assign(new Error('A Awin não retornou uma lista de programas.'), { status: 502 });
      if (action === 'test') await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='AWIN'", [account.id]);
      return res.json({
        provider: 'AWIN',
        status: action === 'test' ? 'VALIDATED' : saved.status,
        relationship,
        count: programmes.length,
        programmes: programmes.slice(0, 100).map(p => ({ id: String(p.id ?? ''), name: clean(p.name, 180), status: clean(p.status, 40), countryCode: clean(p.primaryRegion?.countryCode, 2), currencyCode: clean(p.currencyCode, 3), clickThroughUrl: /^https:\/\//i.test(p.clickThroughUrl || '') ? clean(p.clickThroughUrl, 2000) : '' })),
        publicationEnabled: false,
        note: 'Consulta de leitura; nenhuma oferta foi criada ou publicada.'
      });
    }
    if (action === 'feed') {
      const advertiserId = clean(body.advertiserId, 20);
      const locale = clean(body.locale || 'pt_BR', 10);
      const limit = Math.min(50, Math.max(1, Math.floor(Number(body.limit) || 20)));
      if (!/^\d{1,20}$/.test(advertiserId)) return res.status(400).json({ error: 'Informe o ID numérico do anunciante Awin.' });
      if (!/^[a-z]{2}_[A-Z]{2}$/.test(locale)) return res.status(400).json({ error: 'Locale inválido. Use formato como pt_BR ou en_GB.' });
      const path = '/publishers/' + c.publisherId + '/awinfeeds/download/' + advertiserId + '-retail-' + locale + '.jsonl';
      const raw = await awinRequest(path, c, 20000);
      if (raw.length > 2_000_000) throw Object.assign(new Error('O feed ultrapassou o limite de leitura de 2 MB; use um feed menor no portal Awin.'), { status: 413 });
      const result = normalizeFeed(raw, limit);
      return res.json({ provider: 'AWIN', advertiserId, locale, ...result, publicationEnabled: false });
    }
    return res.status(400).json({ error: 'Ação inválida. Use test, programmes ou feed.' });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('integrations/awin', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60) }));
    return res.status(500).json({ error: 'Não foi possível consultar a Awin. Verifique os logs seguros e as credenciais.' });
  }
}