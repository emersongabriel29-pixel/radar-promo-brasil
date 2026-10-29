import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { buildFfmpegArgs, buildFilterGraph, parseArgs, validateOptions, wrapText } from './render.mjs';
import { assertPublicHttpUrl, extractOfferMetadata } from './fetch-image.mjs';

test('parses supported CLI options', () => {
  assert.deepEqual(parseArgs(['--input', 'produto.jpg', '--output', 'oferta.mp4', '--title', 'Produto', '--duration', '15']), {
    input: 'produto.jpg', output: 'oferta.mp4', title: 'Produto', duration: '15'
  });
});

test('rejects unknown and missing CLI options', () => {
  assert.throws(() => parseArgs(['--publish', 'true']), /não reconhecido/);
  assert.throws(() => parseArgs(['--title']), /Informe um valor/);
});

test('validates image, output, title, duration and overwrite protection', () => {
  assert.throws(() => validateOptions({ input: 'x.pdf', output: 'x.mp4', title: 'X' }), /PNG, JPG ou WebP/);
  assert.throws(() => validateOptions({ input: 'x.jpg', output: 'x.mov', title: 'X' }), /terminar em .mp4/);
  assert.throws(() => validateOptions({ input: 'x.jpg', output: 'x.mp4', title: 'X', duration: 12 }), /duração permitida/);
  assert.throws(() => validateOptions({ input: 'x.jpg', output: 'x.jpg', title: 'X' }), /não pode sobrescrever/);
  assert.throws(() => validateOptions({ input: 'x.jpg', output: 'x.mp4', title: ' '.repeat(121) }), /título é obrigatório/);
});

test('builds a vertical H.264 render command with no audio or network/publishing action', () => {
  const options = validateOptions({ input: './produto.jpg', output: './oferta.mp4', title: 'Produto', price: 'R$ 49,90', duration: '15' });
  const args = buildFfmpegArgs(options, { titleFile: '/tmp/title.txt', priceFile: '/tmp/price.txt', ctaFile: '/tmp/cta.txt' });
  assert.ok(args.includes('libx264'));
  assert.ok(args.includes('-an'));
  assert.match(args[args.indexOf('-vf') + 1], /scale=720:1280/);
  assert.ok(args.includes('15'));
  assert.ok(args.includes(resolve('./oferta.mp4')));
  assert.equal(args.some(value => /https?:\/\//i.test(value)), false);
});

test('uses text files with expansion disabled so user text is not interpreted as filter expressions', () => {
  const graph = buildFilterGraph({ titleFile: '/tmp/title.txt', priceFile: '/tmp/price.txt', ctaFile: '/tmp/cta.txt', font: '', duration: 15 });
  assert.match(graph, /textfile=/);
  assert.match(graph, /expansion=none/);
  assert.match(graph, /scale=720:1280/);
  assert.match(graph, /format=yuv420p/);
});


test('escapes special characters in optional font paths for the FFmpeg filtergraph', () => {
  const graph = buildFilterGraph({
    titleFile: '/tmp/title.txt',
    priceFile: '',
    ctaFile: '/tmp/cta.txt',
    font: "/tmp/Font, [test];it's.ttf",
    duration: 15
  });
  assert.ok(graph.includes("fontfile='/tmp/Font\\, \\[test\\]\\;it\\'s.ttf':"));
});

test('wraps long titles and calls to action without splitting words unnecessarily', () => {
  assert.equal(wrapText('Kit de cozinha completo com vários acessórios', 18), 'Kit de cozinha\ncompleto com\nvários acessórios');
  assert.equal(wrapText('ABCDEFGHIJK', 4), 'ABCD\nEFGH\nIJK');
});

test('accepts offer URL or direct image URL as source', () => {
  assert.deepEqual(parseArgs(['--offer-url', 'https://shop.example/item', '--output', 'out.mp4']), {
    'offer-url': 'https://shop.example/item', output: 'out.mp4'
  });
  assert.deepEqual(parseArgs(['--image-url', 'https://cdn.example/item.jpg', '--output', 'out.mp4', '--title', 'Item']), {
    'image-url': 'https://cdn.example/item.jpg', output: 'out.mp4', title: 'Item'
  });
  assert.throws(() => parseArgs(['--input', 'item.jpg', '--offer-url', 'https://shop.example/item']), /apenas uma origem/);
  assert.throws(() => parseArgs(['--offer-url', 'https://shop.example/item', '--image-url', 'https://cdn.example/item.jpg']), /não ambos/);
});

test('extracts title and Open Graph image, including relative URLs', () => {
  const html = '<html><head><title>Fallback</title><meta property="og:title" content="Produto &amp; Oferta"><meta property="og:image" content="/assets/item.jpg"></head></html>';
  assert.deepEqual(extractOfferMetadata(html, 'https://shop.example/oferta/123'), {
    title: 'Produto & Oferta', imageUrl: 'https://shop.example/assets/item.jpg'
  });
});

test('blocks local and private URL targets before fetching', async () => {
  await assert.rejects(assertPublicHttpUrl('http://127.0.0.1/admin'), /local|privado|reservado/i);
  await assert.rejects(assertPublicHttpUrl('http://localhost/'), /local|internos/i);
  await assert.rejects(assertPublicHttpUrl('file:///etc/passwd'), /HTTP\/HTTPS/);
});
