import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCollshpUrl, parseCollshpHtml } from '../lib/collshp.js';

test('collshp: aceita só https em collshp.com', () => {
  assert.equal(parseCollshpUrl('https://collshp.com/loja?view=storefront').hostname, 'collshp.com');
  for (const bad of ['http://collshp.com/x', 'https://evil.com/collshp.com', 'https://user:p@collshp.com/x', 'https://collshp.com:8443/x', 'https://collshp.com.evil.io/x'])
    assert.throws(() => parseCollshpUrl(bad));
});

test('collshp: extrai produtos de JSON-LD e descarta itens sem título ou link', () => {
  const html = '<title>Minha loja</title><script type="application/ld+json">' + JSON.stringify({ '@graph': [
    { '@type': 'Product', name: 'Fone', url: '/p/1', image: 'https://img.x/1.jpg' },
    { '@type': 'Product', name: '', url: '/p/2' },
    { '@type': 'Product', name: 'Javascript', url: 'javascript:alert(1)' }
  ] }) + '</script>';
  const r = parseCollshpHtml(html, 'https://collshp.com/loja');
  assert.deepEqual(r.products, [{ title: 'Fone', productUrl: 'https://collshp.com/p/1', imageUrl: 'https://img.x/1.jpg' }]);
  assert.equal(r.storefront.name, 'Minha loja');
});

test('front: regex do data-change e dos argumentos numéricos casam', () => {
  const src = fs.readFileSync(new URL('../public/radar.js', import.meta.url), 'utf8');
  const change = src.match(/getAttribute\('data-change'\)\|\|'';if\(!(\/.*?\/)\.test\(name\)\)return;/)[1];
  assert.ok(eval(change).test('changeReportDays'));
  const num = src.match(/if\((\/\^\[-\+\]\?.*?\/)\.test\(value\)\)return Number\(value\)/)[1];
  assert.ok(eval(num).test('5') && eval(num).test('-1.5') && !eval(num).test('abc'));
});
