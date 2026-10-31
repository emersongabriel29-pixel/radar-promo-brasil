import test from 'node:test';
import assert from 'node:assert/strict';
import { lomadeeCatalogPages, selectLomadeeDiscoveryProducts } from '../lib/lomadee-worker.js';

function product(id, overrides = {}) {
  return {
    id,
    name: 'Fone Bluetooth',
    url: 'https://loja.example.com/fone-bluetooth-' + id,
    organizationId: 'org-1',
    available: true,
    images: [{ url: 'https://cdn.example.com/' + id + '.jpg' }],
    options: [{
      name: 'Fone Bluetooth ' + id,
      available: true,
      pricing: [{ listPrice: 100, price: 50 }]
    }],
    ...overrides
  };
}

test('Lomadee page rotation is bounded, unique and advances hourly', () => {
  const first = lomadeeCatalogPages(Date.UTC(2026, 9, 30, 0, 0, 0));
  const next = lomadeeCatalogPages(Date.UTC(2026, 9, 30, 1, 0, 0));
  assert.deepEqual(first, [1, 6, 11, 16, 21]);
  assert.deepEqual(next, [2, 7, 12, 17, 22]);
  assert.equal(new Set(first).size, 5);
  assert.ok(first.every(page => page >= 1 && page <= 25));
});

test('Lomadee worker filters invalid products and caps organization concentration', () => {
  const candidates = [
    product('one'),
    product('two'),
    product('three'),
    product('no-discount', {
      options: [{ name: 'Fone Bluetooth sem desconto', available: true, pricing: [{ listPrice: 50, price: 50 }] }]
    }),
    product('no-image', { images: [{ url: 'https://cdn.example.com/no-extension' }] }),
    product('no-organization', { organizationId: '' })
  ];

  const selected = selectLomadeeDiscoveryProducts(candidates);
  assert.deepEqual(selected.map(item => item.id), ['one', 'two']);
  assert.ok(selected.every(item => item.available === true));
});
