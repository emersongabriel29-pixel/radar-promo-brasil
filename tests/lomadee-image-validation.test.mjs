import test from 'node:test';
import assert from 'node:assert/strict';
import { directImageUrl } from '../lib/validation.js';

test('accepts extensionless VTEX image CDN paths', () => {
  assert.equal(
    directImageUrl('https://carrarob2c.vteximg.com.br/arquivos/ids/161897_2'),
    'https://carrarob2c.vteximg.com.br/arquivos/ids/161897_2'
  );
});

test('does not treat a VTEX product page as an image', () => {
  assert.equal(
    directImageUrl('https://loja.carraro.com.br/armario-de-cozinha/p?idsku=12999268'),
    ''
  );
});
