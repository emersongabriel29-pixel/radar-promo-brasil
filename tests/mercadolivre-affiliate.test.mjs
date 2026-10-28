import test from 'node:test';
import assert from 'node:assert/strict';
import { createMercadoLivreAffiliateUrl, validateMercadoLivreProductUrl } from '../lib/mercadolivre-affiliate.js';

test('accepts only HTTPS Mercado Livre Brazil and meli.la URLs', () => {
  assert.match(validateMercadoLivreProductUrl('https://www.mercadolivre.com.br/MLB-123-produto'), /^https:/);
  assert.match(validateMercadoLivreProductUrl('https://meli.la/abc123'), /^https:/);
  assert.equal(validateMercadoLivreProductUrl('http://mercadolivre.com.br/item'), '');
  assert.equal(validateMercadoLivreProductUrl('https://mercadolivre.com.br.attacker.example/item'), '');
  assert.equal(validateMercadoLivreProductUrl('https://user:pass@mercadolivre.com.br/item'), '');
  assert.equal(validateMercadoLivreProductUrl('https://example.com/item'), '');
});

test('rejects invalid product URLs before network requests', async () => {
  let calls = 0;
  await assert.rejects(createMercadoLivreAffiliateUrl({
    productUrl: 'https://evil.example/item', tag: 'tag', cookies: [{ name: '_csrf', value: '123456789' }],
    fetchImpl: async () => { calls++; }
  }), /URL HTTPS válida/);
  assert.equal(calls, 0);
});

test('requires valid cookie names and values', async () => {
  await assert.rejects(createMercadoLivreAffiliateUrl({
    productUrl: 'https://www.mercadolivre.com.br/item', tag: 'tag', cookies: [{ name: 'bad name', value: 'x' }],
    fetchImpl: async () => ({ ok: true, text: async () => '' })
  }), /Formato de cookies inválido/);
});

test('creates link with mocked HTTP only and validates returned affiliate domain', async () => {
  const calls = [];
  const link = await createMercadoLivreAffiliateUrl({
    productUrl: 'https://www.mercadolivre.com.br/MLB-123-produto',
    tag: 'radar-tag',
    cookies: [{ name: '_csrf', value: 'csrf-token-123456789' }, { name: 'session', value: 'fake-cookie' }],
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (calls.length === 1) return { ok: true, status: 200, text: async () => '<html></html>' };
      return { ok: true, status: 200, json: async () => ({ short_url: 'https://meli.la/abc123' }) };
    }
  });
  assert.equal(link, 'https://meli.la/abc123');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].url, 'https://www.mercadolivre.com.br/affiliate-program/api/v2/stripe/user/links');
  assert.equal(calls[1].options.body.includes('radar-tag'), true);
});

test('rejects unexpected returned link host', async () => {
  await assert.rejects(createMercadoLivreAffiliateUrl({
    productUrl: 'https://www.mercadolivre.com.br/item', tag: 'tag',
    cookies: [{ name: '_csrf', value: 'csrf-token-123456789' }],
    fetchImpl: async (url) => String(url).includes('/affiliate-program/')
      ? { ok: true, status: 200, json: async () => ({ short_url: 'https://attacker.example/link' }) }
      : { ok: true, status: 200, text: async () => '' }
  }), /link HTTPS de afiliado reconhecido/);
});
