import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { prepareTelegramOfferLinks } from '../integrations/telegram/affiliate-link.js';

const root = process.cwd();

test('arquivos de integração JavaScript são código-fonte, não envelopes JSON', () => {
  const roots = ['api', 'integrations', 'lib', 'workers'];
  const files = roots.flatMap((directory) => {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) return [];
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(file);
      return /\.m?js$/.test(entry.name) ? [file] : [];
    });
    return walk(absolute);
  });

  assert.ok(files.length > 0, 'deve haver arquivos de integração para validar');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8').trimStart();
    assert.ok(!source.startsWith('{\n  "path"'), `${path.relative(root, file)} contém envelope JSON em vez de JavaScript`);
    assert.ok(!source.startsWith('{"path"'), `${path.relative(root, file)} contém envelope JSON em vez de JavaScript`);
  }
});

test('publicação no Telegram usa o adaptador isolado de links', () => {
  const file = path.join(root, 'api/jobs/telegram.js');
  assert.ok(fs.existsSync(file), 'o job de publicação do Telegram deve existir');
  const source = fs.readFileSync(file, 'utf8');

  assert.match(source, /prepareTelegramOfferLinks/);
  assert.match(source, /affiliateUrl\s*\}\s*=\s*prepareTelegramOfferLinks\(item\)/);
  assert.doesNotMatch(source, /trackingUrl\s*=\s*origin\s*\+\s*['"]\/api\/r\//);
});

test('adaptador Telegram preserva a URL original e acrescenta cupom uma única vez', () => {
  const original = 'https://www.mercadolivre.com.br/oferta?aff_id=abc';
  const first = prepareTelegramOfferLinks({
    affiliateUrl: original,
    message: `Oferta imperdível: ${original}`,
    couponCode: 'RADAR10',
    couponUrl: 'https://loja.example/cupom/RADAR10'
  });

  assert.equal(first.affiliateUrl, original);
  assert.ok(first.message.includes(original));
  assert.ok(first.message.includes('https://loja.example/cupom/RADAR10'));
  assert.equal(prepareTelegramOfferLinks({
    affiliateUrl: original,
    message: first.message,
    couponCode: 'RADAR10',
    couponUrl: 'https://loja.example/cupom/RADAR10'
  }).message, first.message);
});

test('adaptador Telegram tolera links/cupom ausentes sem inventar redirecionamento', () => {
  assert.deepEqual(prepareTelegramOfferLinks({ message: 'Oferta' }), {
    affiliateUrl: '',
    message: 'Oferta'
  });
});

test('cada integração deve ter documentação de fronteira e migração gradual', () => {
  const guide = fs.readFileSync(path.join(root, 'integrations/README.md'), 'utf8');
  assert.match(guide, /uma integração por PR/i);
  assert.match(guide, /Preservar a URL de afiliado original/i);
  assert.match(guide, /testes/i);
});
