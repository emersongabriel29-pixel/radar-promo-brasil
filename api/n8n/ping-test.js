import { db, config } from 'hatchable';

export const access = 'member';
export const methods = ['POST'];

const N8N_WEBHOOK = 'https://radar-n8n.duckdns.org/webhook/radar-ofertas';

async function hmacHex(keyText, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyText),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req, res) {
  if (!req.member) return res.status(401).json({ ok: false, error: 'Entre no Radar Promo Brasil para executar o teste.' });

  try {
    const account = (await db.query(
      "SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE'",
      [String(req.member.id)]
    )).rows[0];
    if (!account) return res.status(412).json({ ok: false, error: 'Abra o painel para inicializar sua conta.' });

    const master = String(await config.get('N8N_WEBHOOK_SECRET') || '').trim();
    if (!master) return res.status(503).json({ ok: false, error: 'Segredo do webhook não configurado.' });

    const timestamp = String(Math.floor(Date.now() / 1000));
    const eventId = 'rpb-ping-' + crypto.randomUUID();
    const rawBody = JSON.stringify({ accountId: account.id, eventId, action: 'ping' });
    const accountSecret = await hmacHex(master, account.id);
    const signature = await hmacHex(accountSecret, timestamp + '.' + rawBody);

    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rpb-timestamp': timestamp,
        'x-rpb-signature': 'sha256=' + signature
      },
      body: rawBody,
      redirect: 'error',
      signal: AbortSignal.timeout(12000)
    });
    const payload = await response.json().catch(() => ({}));
    return res.status(response.ok ? 200 : 502).json({
      ok: response.ok && payload.ok === true,
      status: response.status,
      eventId,
      action: 'ping',
      response: payload,
      message: response.ok && payload.ok === true
        ? 'Ping autenticado concluído entre Hatchable, n8n e ponte.'
        : 'O webhook respondeu, mas o teste de ponta a ponta não foi aprovado.'
    });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return res.status(502).json({
      ok: false,
      status: timeout ? 'TIMEOUT' : 'CONNECTION_ERROR',
      error: timeout ? 'Tempo limite ao chamar o webhook do n8n.' : 'Não foi possível concluir o ping autenticado.',
      message: 'Nenhuma oferta foi enviada por este teste.'
    });
  }
}
