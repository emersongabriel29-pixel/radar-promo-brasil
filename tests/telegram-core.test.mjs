import test from 'node:test';
import assert from 'node:assert/strict';
import { validBotToken, buildTelegramCaption } from '../lib/telegram-core.js';
import { telegramHtml, sendTelegramOffer } from '../lib/telegram.js';

test('valida token Telegram sem aceitar vazio ou formatos inválidos', () => {
  assert.equal(validBotToken('123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi'), true);
  assert.equal(validBotToken(''), false);
  assert.equal(validBotToken('token-invalido'), false);
  assert.equal(validBotToken('123:curto'), false);
});

test('monta legenda de oferta com link rastreável dentro do limite de foto do Telegram', () => {
  const caption = buildTelegramCaption('🔥 Oferta em destaque', 'https://example.com/oferta');
  assert.match(caption, /Oferta em destaque/);
  assert.match(caption, /https:\/\/example\.com\/oferta/);
  assert.ok(caption.length <= 1024);
});

test('escapa HTML e preserva convenções de negrito e tachado sem aceitar tags injetadas', () => {
  const rendered = telegramHtml('*Oferta* <script>alert(1)</script> ~antigo~');
  assert.match(rendered, /<b>Oferta<\/b>/);
  assert.match(rendered, /&lt;script&gt;/);
  assert.match(rendered, /<s>antigo<\/s>/);
  assert.doesNotMatch(rendered, /<script>/);
});

test('envio de mensagem simples chama sendMessage com HTML seguro e sem preview', async () => {
  const originalFetch = globalThis.fetch;
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options, payload: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 77 } }) };
  };
  try {
    const result = await sendTelegramOffer('123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi', {
      contentType: 'MESSAGE',
      message: '*Oferta* <b>não confiável</b>',
      groupExternalId: '-100123456789'
    });
    assert.equal(result.message_id, 77);
    assert.match(call.url, /\/sendMessage$/);
    assert.equal(call.payload.chat_id, '-100123456789');
    assert.equal(call.payload.parse_mode, 'HTML');
    assert.equal(call.payload.link_preview_options.is_disabled, true);
    assert.match(call.payload.text, /<b>Oferta<\/b>/);
    assert.match(call.payload.text, /&lt;b&gt;não confiável&lt;\/b&gt;/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('envio de oferta com imagem usa sendPhoto, legenda limitada e botão com URL de oferta', async () => {
  const originalFetch = globalThis.fetch;
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, payload: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 88 } }) };
  };
  try {
    const result = await sendTelegramOffer('123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi', {
      contentType: 'PROMOTION',
      message: '🔥 Oferta de teste',
      imageUrl: 'https://example.com/produto.jpg',
      affiliateUrl: 'https://example.com/afiliado',
      groupExternalId: '-100123456789'
    });
    assert.equal(result.message_id, 88);
    assert.match(call.url, /\/sendPhoto$/);
    assert.equal(call.payload.chat_id, '-100123456789');
    assert.equal(call.payload.photo, 'https://example.com/produto.jpg');
    assert.ok(call.payload.caption.length <= 1024);
    assert.equal(call.payload.reply_markup.inline_keyboard[0][0].url, 'https://example.com/afiliado');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
