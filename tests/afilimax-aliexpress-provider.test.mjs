import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  createAliExpressAffiliateUrl,
  signAliExpressParams,
  validateAliExpressProductUrl
} from '../lib/afilimax-aliexpress-provider.js';

test('allows only HTTPS product URLs on official AliExpress domains', () => {
  assert.equal(validateAliExpressProductUrl('https://pt.aliexpress.com/item/123.html'), 'https://pt.aliexpress.com/item/123.html');
  assert.equal(validateAliExpressProductUrl('http://aliexpress.com/item/123'), '');
  assert.equal(validateAliExpressProductUrl('https://aliexpress.com.attacker.example/item/123'), '');
  assert.equal(validateAliExpressProductUrl('https://user:pass@aliexpress.com/item/123'), '');
  assert.equal(validateAliExpressProductUrl('https://example.com/item/123'), '');
});

test('signs parameters using sorted key/value pairs and HMAC-SHA256', async () => {
  const params = { v: '2.0', app_key: '123', method: 'aliexpress.affiliate.link.generate' };
  const expectedBase = Object.keys(params).sort().map(key => key + params[key]).join('');
  const expected = createHmac('sha256', 'secret').update(expectedBase, 'utf8').digest('hex').toUpperCase();
  assert.equal(await signAliExpressParams(params, 'secret'), expected);
});

test('creates affiliate link with injected fetch and does not expose app secret in query', async () => {
  let requested;
  const link = await createAliExpressAffiliateUrl({
    appKey: 'app-123',
    appSecret: 'must-not-be-sent',
    trackingId: 'track-1',
    productUrl: 'https://pt.aliexpress.com/item/123.html',
    nowMs: Date.UTC(2026, 9, 17, 12, 0, 0),
    fetchImpl: async (url, options) => {
      requested = { url: new URL(url), options };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          aliexpress_affiliate_link_generate_response: {
            resp_result: {
              resp_code: 200,
              resp_msg: 'success',
              result: { promotion_links: { promotion_link: [{ promotion_link: 'https://s.click.aliexpress.com/e/_test123' }] } }
            }
          }
        })
      };
    }
  });
  assert.equal(link, 'https://s.click.aliexpress.com/e/_test123');
  assert.equal(requested.options.method, 'GET');
  assert.equal(requested.url.hostname, 'api-sg.aliexpress.com');
  assert.equal(requested.url.searchParams.get('app_key'), 'app-123');
  assert.equal(requested.url.searchParams.get('app_secret'), null);
  assert.equal(requested.url.searchParams.get('sign_method'), 'sha256');
  assert.equal(requested.url.searchParams.get('sign').length, 64);
});

test('rejects invalid URLs before making an API request', async () => {
  let called = false;
  await assert.rejects(
    createAliExpressAffiliateUrl({
      appKey: 'a', appSecret: 'b', trackingId: 'c',
      productUrl: 'https://example.com/not-aliexpress',
      fetchImpl: async () => { called = true; }
    }),
    /URL HTTPS válida/
  );
  assert.equal(called, false);
});

test('sanitizes API errors and rejects unexpected link hosts', async () => {
  await assert.rejects(
    createAliExpressAffiliateUrl({
      appKey: 'a', appSecret: 'b', trackingId: 'c',
      productUrl: 'https://aliexpress.com/item/123',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ aliexpress_affiliate_link_generate_response: { resp_result: { resp_code: 401, resp_msg: 'contains-secret', result: {} } } })
      })
    }),
    error => error.status === 502 && !error.message.includes('contains-secret')
  );
  await assert.rejects(
    createAliExpressAffiliateUrl({
      appKey: 'a', appSecret: 'b', trackingId: 'c',
      productUrl: 'https://aliexpress.com/item/123',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ aliexpress_affiliate_link_generate_response: { resp_result: { resp_code: 200, result: { promotion_links: { promotion_link: [{ promotion_link: 'https://evil.example/link' }] } } } } })
      })
    }),
    /link de afiliado HTTPS reconhecido/
  );
});
