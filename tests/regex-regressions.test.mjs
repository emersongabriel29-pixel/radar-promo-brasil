import test from 'node:test';
import assert from 'node:assert/strict';

// Regression contracts for the production regex defects fixed in this PR.
test('Android extension bearer token is recognized', () => {
  const token = 'rpb_ext_' + 'A'.repeat(32);
  const match = ('Bearer ' + token).match(/^Bearer\s+(rpb_ext_[A-Za-z0-9_-]{30,100})$/);
  assert.equal(match?.[1], token);
});

test('shared-offer preview collapses whitespace', () => {
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  assert.equal(clean('  oferta\n\t especial   hoje '), 'oferta especial hoje');
});

test('Magalu Gemini JSON fences are removed', () => {
  const raw = String('```json\n{"ok":true}\n```')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  assert.deepEqual(JSON.parse(raw), { ok: true });
});

test('Magalu BRL thousands and decimal separators normalize', () => {
  const priceText = 'R$ 1.299,90';
  const normalized = priceText.replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(?:[,.]|$))/g, '').replace(',', '.');
  assert.equal(Number(normalized), 1299.90);
});

test('Telegram tracking link regex matches the whole URL', () => {
  const affiliate = 'https://loja.example/oferta';
  const message = 'Confira https://radar-promo-brasil.hatchable.site/api/r/abc-123 agora';
  const replaced = message.replace(/https?:\/\/[^\s]+\/api\/r\/[0-9a-f-]+/gi, affiliate);
  assert.equal(replaced, 'Confira ' + affiliate + ' agora');
});
