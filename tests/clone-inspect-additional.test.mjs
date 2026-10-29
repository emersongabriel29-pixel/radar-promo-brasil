import test from 'node:test';
import assert from 'node:assert/strict';
import { default as inspectClone } from '../api/clone/inspect.js';

async function inspect(url) {
  let status = 200, body;
  const res = {
    status(code) { status = code; return this; },
    json(value) { body = value; return this; },
  };
  await inspectClone({ method: 'POST', member: { id: 'clone-additional-test' }, body: { url } }, res);
  return { status, body };
}

test('Modo clone preserva query strings e parâmetros de rastreamento sem validar comissão', async () => {
  const url = 'https://shopee.com.br/product/123?utm_source=telegram&aff_id=abc%2F123';
  const result = await inspect(url);
  assert.equal(result.status, 200);
  assert.equal(result.body.originalUrl, url);
  assert.equal(result.body.trackingParametersPreserved, true);
  assert.equal(result.body.affiliateStatus, 'UNVERIFIED');
  assert.equal(result.body.canPublish, false);
});

test('Modo clone reconhece domínios de marketplaces explicitamente suportados', async (t) => {
  const cases = [
    ['https://www.mercadolivre.com.br/oferta?matt_tool=123', 'MERCADOLIVRE_AFFILIATE_OR_PRODUCT', 'MERCADOLIVRE'],
    ['https://amzn.to/abc123?tag=radar-20', 'AMAZON_AFFILIATE_OR_PRODUCT', 'AMAZON'],
    ['https://www.aliexpress.com/item/123.html?aff_fcid=abc', 'ALIEXPRESS_AFFILIATE_OR_PRODUCT', 'ALIEXPRESS'],
    ['https://br.shein.com/product-p-123.html?mallCode=1', 'SHEIN_AFFILIATE_OR_PRODUCT', 'SHEIN'],
  ];
  for (const [url, kind, marketplace] of cases) {
    await t.test(marketplace, async () => {
      const result = await inspect(url);
      assert.equal(result.status, 200);
      assert.equal(result.body.kind, kind);
      assert.equal(result.body.marketplace, marketplace);
      assert.equal(result.body.canPublish, false);
      assert.equal(result.body.affiliateStatus, 'UNVERIFIED');
    });
  }
});

test('Modo clone rejeita URLs malformadas e protocolos não HTTPS sem realizar importação', async () => {
  for (const url of ['', 'not-a-url', 'ftp://example.org/item', 'https://localhost:8443/admin', 'https://[::1]/private']) {
    const result = await inspect(url);
    assert.equal(result.status, 400, String(url));
    assert.equal(result.body.ok, false, String(url));
  }
});
