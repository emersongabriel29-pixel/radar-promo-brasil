import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFfmpegArgs, buildFilterGraph, parseArgs, validateOptions } from './render.mjs';

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
  assert.ok(args.includes('720x1280') === false); // dimensions are enforced in the video filter, not a CLI resolution flag
  assert.ok(args.includes('-an'));
  assert.ok(args.includes('15'));
  assert.ok(args.includes('./oferta.mp4'));
  assert.equal(args.some(value => /https?:\/\//i.test(value)), false);
});

test('uses text files with expansion disabled so user text is not interpreted as filter expressions', () => {
  const graph = buildFilterGraph({ titleFile: '/tmp/title.txt', priceFile: '/tmp/price.txt', ctaFile: '/tmp/cta.txt', font: '', duration: 15 });
  assert.match(graph, /textfile=/);
  assert.match(graph, /expansion=none/);
  assert.match(graph, /scale=720:1280/);
  assert.match(graph, /format=yuv420p/);
});
