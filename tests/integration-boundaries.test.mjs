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

  assert.ok(files.length > 0, 'deve haver arquivos para validar');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8').trimStart();
    assert.ok(!source.startsWith('{\n  "path"'), `${path.relative(root, file)} contém envelope JSON em vez de JavaScript`);
    assert.ok(!source.startsWith('{"path"'), `${path.relative(root, file)} contém envelope JSON em vez de JavaScript`);
  }
});

test('job do Telegram usa adaptador isolado e não cria redirecionamento interno', () => {
  const file = path.join(root, 'api/jobs/telegram.js');
  assert.ok(fs.existsSync(file), 'o job de publicação do Telegram deve existir');
  const source = fs.readFileSync(file, 'utf8');

  assert.ok(source.includes('prepareTelegramOfferLinks(item)'), 'o job deve chamar o adaptador');
  assert.ok(source.includes('message:trackedMessage') || source.includes('message: trackedMessage'), 'a mensagem deve usar o texto preparado');
  assert.ok(source.includes('affiliateUrl}'), 'o envio deve receber o link original preparado');
  assert.doesNotMatch(source, /trackingUrl\s*=\s*origin\s*\+\s*['"]\/api\/r\//);
});

test('adaptador Telegram preserva link afiliado e acrescenta cupom sem duplicar', () => {
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

test('adaptador Telegram tolera links e cupons ausentes', () => {
  assert.deepEqual(prepareTelegramOfferLinks({ message: 'Oferta' }), {
    affiliateUrl: '',
    message: 'Oferta'
  });
});

test('documentação define fronteiras e migração gradual', () => {
  const guide = fs.readFileSync(path.join(root, 'integrations/README.md'), 'utf8').toLowerCase();
  assert.match(guide, /integração por pr/);
  assert.match(guide, /preservar a url de afiliado original/);
  assert.match(guide, /testes/);
});
