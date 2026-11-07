import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLomadeeShortUrl } from '../lib/lomadee-shortener.js';

test('extracts shortUrl from the object response used by Lomadee', () => {
  assert.equal(
    extractLomadeeShortUrl({ data: { originalUrl: 'https://store.example/item', shortUrl: 'https://lomadee.com/xYz', active: true } }),
    'https://lomadee.com/xYz'
  );
});

test('extracts shortUrl from a top-level object', () => {
  assert.equal(extractLomadeeShortUrl({ shortUrl: 'https://lomadee.com/abc' }), 'https://lomadee.com/abc');
});

test('extracts a URL from array and nested shortUrls responses', () => {
  assert.equal(extractLomadeeShortUrl([{ shortUrls: ['https://lomadee.com/first'] }]), 'https://lomadee.com/first');
  assert.equal(extractLomadeeShortUrl({ data: [{ shortUrls: ['https://lomadee.com/second'] }] }), 'https://lomadee.com/second');
});

test('rejects non-HTTPS and missing URLs', () => {
  assert.equal(extractLomadeeShortUrl({ data: { shortUrl: 'http://lomadee.com/nope' } }), '');
  assert.equal(extractLomadeeShortUrl({ data: {} }), '');
  assert.equal(extractLomadeeShortUrl(null), '');
});
