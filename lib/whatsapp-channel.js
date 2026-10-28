import { config } from 'hatchable';

const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const baseUrl = async () => {
  const raw = clean(await config.get('WHATSAPP_CHANNEL_API_URL'), 500).replace(/\/+$/, '');
  if (!raw || !/^https:\/\//i.test(raw)) {
    throw Object.assign(new Error('Configure WHATSAPP_CHANNEL_API_URL com a URL HTTPS da API WhatsApp auto-hospedada.'), { code: 'SETUP_REQUIRED' });
  }
  return raw;
};
const apiKey = async () => {
  const key = clean(await config.get('WHATSAPP_CHANNEL_API_KEY'), 500);
  if (key.length < 16) throw Object.assign(new Error('Configure WHATSAPP_CHANNEL_API_KEY nos segredos do servidor.'), { code: 'SETUP_REQUIRED' });
  return key;
};
async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  const url = await baseUrl();
  const key = await apiKey();
  let response, data;
  try {
    response = await fetch(url + path, {
      method,
      headers: {
        'x-api-key': key,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    });
    data = await response.json().catch(() => ({}));
  } catch {
    throw Object.assign(new Error('A API WhatsApp não confirmou a operação. Confira o canal antes de tentar novamente.'), {
      code: method === 'GET' ? 'WHATSAPP_API_UNAVAILABLE' : 'DELIVERY_UNCONFIRMED'
    });
  }
  if (!response.ok) {
    const message = clean(data.error?.message || data.message || data.error || 'Falha na API WhatsApp.', 300);
    throw Object.assign(new Error(message), {
      status: response.status,
      code: response.status === 409 ? 'DELIVERY_UNCONFIRMED' : 'WHATSAPP_API_ERROR'
    });
  }
  return data;
}

function selector(channel) {
  const value = clean(channel, 1200);
  if (!value) throw new Error('Informe o link do Canal do WhatsApp.');
  if (/^https:\/\/whatsapp\.com\/channel\//i.test(value)) return { link: value };
  if (/^[^\s@]+@newsletter$/.test(value)) return { jid: value };
  throw new Error('O destino deve ser o link whatsapp.com/channel/... ou um JID @newsletter obtido pela API.');
}

export async function whatsappChannelHealth() {
  return request('/healthz');
}

export async function listWhatsAppChannels() {
  return request('/channel?limit=50&offset=0');
}

export async function checkWhatsAppChannelRole(channel) {
  return request('/channel/check-role', { method: 'POST', body: selector(channel) });
}

export async function sendWhatsAppChannelText({ channel, message, publicationId }) {
  const text = clean(message, 4000);
  if (!text) throw new Error('A mensagem está vazia.');
  if (!publicationId) throw new Error('publicationId é obrigatório para impedir reenvios duplicados.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('radar-whatsapp-channel:' + String(publicationId)));
  const idempotencyKey = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const result = await request('/channel/send', {
      method: 'POST',
      body: { ...selector(channel), message: text },
      idempotencyKey
    });
    return { status: 'PUBLISHED', externalMessageId: clean(result.data?.id || result.data?.messageId || result.id || result.messageId || result.key?.id || '', 300), result };
  } catch (error) {
    if (error.code === 'DELIVERY_UNCONFIRMED' || error.name === 'TimeoutError' || error.name === 'AbortError') {
      return { status: 'WAITING_CONFIRMATION', reason: 'Confira o canal do WhatsApp antes de reenviar.', error: clean(error.message, 300) };
    }
    throw error;
  }
}
