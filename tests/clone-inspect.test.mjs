import test from 'node:test';
import assert from 'node:assert/strict';
import { default as inspectClone } from '../api/clone/inspect.js';

async function invoke(url, member = { id: 'clone-test-member' }) {
  let status = 200, body;
  const res = {
    status(code) { status = code; return this; },
    json(value) { body = value; return this; },
  };
  await inspectClone({ method: 'POST', member, body: { url } }, res);
  return { status, body };
}

test('Modo clone reconhece convite WhatsApp sem tentar ler o grupo', async () => {
  const result = await invoke('https://chat.whatsapp.com/AbcdefghijklMNOP');
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, 'WHATSAPP_INVITE');
  assert.equal(result.body.canPublish, false);
  assert.equal(result.body.importMode, 'AUTHORIZED_CONNECTION_REQUIRED');
  assert.match(result.body.message, /não permite consultar membros ou mensagens/i);
});

test('Modo clone reconhece Telegram público e mantém publicação bloqueada', async () => {
  const result = await invoke('https://t.me/ofertas_exemplo');
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, 'TELEGRAM_LINK');
  assert.equal(result.body.platform, 'TELEGRAM');
  assert.equal(result.body.canPublish, false);
});

test('Modo clone reconhece marketplace sem afirmar que link é afiliado válido', async () => {
  const result = await invoke('https://shopee.com.br/product/123');
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, 'SHOPEE_AFFILIATE_OR_PRODUCT');
  assert.equal(result.body.affiliateStatus, 'UNVERIFIED');
  assert.equal(result.body.canPublish, false);
});

test('Modo clone classifica domínio desconhecido como não suportado, sem tentar importar', async () => {
  const result = await invoke('https://example.org/item');
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, 'PUBLIC_URL');
  assert.equal(result.body.status, 'PUBLIC_URL_UNSUPPORTED_FOR_AUTOMATIC_IMPORT');
  assert.equal(result.body.canPublish, false);
});

test('Modo clone bloqueia URL HTTP e destinos internos', async () => {
  for (const url of [
    'http://chat.whatsapp.com/AbcdefghijklMNOP',
    'https://localhost/admin',
    'https://127.0.0.1/private',
    'https://user:pass@shopee.com.br/product/123',
  ]) {
    const result = await invoke(url);
    assert.equal(result.status, 400, url);
    assert.equal(result.body.ok, false, url);
  }
});

test('Modo clone exige autenticação para inspecionar links', async () => {
  const result = await invoke('https://t.me/ofertas_exemplo', null);
  assert.equal(result.status, 401);
});
