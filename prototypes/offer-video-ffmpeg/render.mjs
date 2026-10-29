#!/usr/bin/env node
/**
 * Standalone prototype for rendering a product-offer video.
 * Local-image mode makes no network requests. Remote-image mode fetches public HTTP(S)
 * sources only; no provider APIs, publishing, or Radar runtime imports.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, access } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { fetchOfferImage } from './fetch-image.mjs';

export function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Argumento inesperado: ${token}`);
    const key = token.slice(2);
    if (!['input', 'image-url', 'offer-url', 'output', 'title', 'price', 'cta', 'duration', 'font'].includes(key)) {
      throw new Error(`Argumento não reconhecido: --${key}`);
    }
    if (Object.hasOwn(result, key)) throw new Error(`Argumento duplicado: --${key}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Informe um valor para --${key}`);
    result[key] = value;
  }
  if (result.input && (result['image-url'] || result['offer-url'])) throw new Error('Use apenas uma origem: --input, --image-url ou --offer-url.');
  if (result['image-url'] && result['offer-url']) throw new Error('Use --image-url ou --offer-url, não ambos.');
  return result;
}

export function validateOptions(options) {
  const title = String(options.title || '').trim();
  const input = String(options.input || '').trim();
  const output = String(options.output || '').trim();
  const price = String(options.price || '').trim();
  const cta = String(options.cta || 'Confira os detalhes no link da publicação').trim();
  const duration = Number(options.duration ?? 15);

  if (!title || title.length > 120) throw new Error('O título é obrigatório (ou deve ser extraído do link) e deve ter até 120 caracteres.');
  if (!input) throw new Error('Informe --input, --offer-url ou --image-url.');
  if (!output) throw new Error('Informe o destino MP4 com --output.');
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extname(input).toLowerCase())) {
    throw new Error('A imagem deve ser PNG, JPG ou WebP.');
  }
  if (price.length > 50) throw new Error('O preço deve ter até 50 caracteres.');
  if (!cta || cta.length > 100) throw new Error('A chamada para ação deve ter até 100 caracteres.');
  if (![10, 15, 20, 30].includes(duration)) throw new Error('A duração permitida é 10, 15, 20 ou 30 segundos.');

  const inputPath = resolve(input);
  const outputPath = resolve(output);
  if (inputPath === outputPath) throw new Error('A saída não pode sobrescrever a imagem de entrada.');
  if (extname(outputPath).toLowerCase() !== '.mp4') throw new Error('O arquivo de saída deve terminar em .mp4.');

  return { inputPath, outputPath, title, price, cta, duration, font: options.font ? resolve(options.font) : '' };
}

function filterPath(value) {
  // Escape FFmpeg filtergraph delimiters even though the process is spawned without a shell.
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/;/g, '\\;');
}

function textFileFilter(file, { font, size, y, color = 'white' }) {
  const fontPart = font ? `fontfile='${filterPath(font)}':` : '';
  return `drawtext=${fontPart}textfile='${filterPath(file)}':expansion=none:fontcolor=${color}:fontsize=${size}:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.7:shadowx=2:shadowy=2`;
}

export function wrapText(value, maxChars) {
  const words = String(value || '').replace(/[\r\n]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const originalWord of words) {
    const pieces = [];
    for (let i = 0; i < originalWord.length; i += maxChars) pieces.push(originalWord.slice(i, i + maxChars));
    for (const piece of pieces) {
      if (!line) line = piece;
      else if ((line + ' ' + piece).length <= maxChars) line += ' ' + piece;
      else { lines.push(line); line = piece; }
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

export function buildFilterGraph({ titleFile, priceFile, ctaFile, font, duration }) {
  const frames = duration * 30;
  const filters = [
    'scale=720:1280:force_original_aspect_ratio=increase',
    'crop=720:1280',
    `zoompan=z='min(zoom+0.00025,1.035)':d=${frames}:s=720x1280:fps=30`,
    'drawbox=x=0:y=100:w=iw:h=270:color=black@0.48:t=fill',
    textFileFilter(titleFile, { font, size: 38, y: 125 }),
    'drawbox=x=0:y=900:w=iw:h=310:color=black@0.58:t=fill',
    ...(priceFile ? [textFileFilter(priceFile, { font, size: 42, y: 925, color: 'white' })] : []),
    textFileFilter(ctaFile, { font, size: 28, y: 1090 }),
    'format=yuv420p'
  ];
  return filters.join(',');
}

export function buildFfmpegArgs(options, files) {
  const graph = buildFilterGraph({
    titleFile: files.titleFile,
    priceFile: options.price ? files.priceFile : '',
    ctaFile: files.ctaFile,
    font: options.font,
    duration: options.duration
  });
  return [
    '-hide_banner', '-loglevel', 'error', '-n',
    '-loop', '1', '-framerate', '30', '-i', options.inputPath,
    '-vf', graph, '-t', String(options.duration), '-r', '30',
    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-movflags', '+faststart', options.outputPath
  ];
}

async function runFfmpeg(args) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); if (stderr.length > 12000) stderr = stderr.slice(-12000); });
    child.once('error', error => reject(new Error(`Não consegui iniciar o FFmpeg. Instale o FFmpeg e confira o PATH. ${error.message}`)));
    child.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`FFmpeg encerrou com código ${code}: ${stderr.trim()}`)));
  });
}

export async function render(options) {
  const valid = validateOptions(options);
  await access(valid.inputPath);
  try { await access(valid.outputPath); throw new Error('O arquivo de saída já existe; escolha outro caminho para não sobrescrevê-lo.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const workDir = await mkdtemp(resolve(tmpdir(), 'radar-offer-video-'));
  try {
    const titleFile = resolve(workDir, 'title.txt');
    const priceFile = resolve(workDir, 'price.txt');
    const ctaFile = resolve(workDir, 'cta.txt');
    await Promise.all([
      writeFile(titleFile, wrapText(valid.title, 30), 'utf8'),
      writeFile(priceFile, wrapText(valid.price, 24), 'utf8'),
      writeFile(ctaFile, wrapText(valid.cta, 42), 'utf8')
    ]);
    const args = buildFfmpegArgs(valid, { titleFile, priceFile, ctaFile });
    await runFfmpeg(args);
    await access(valid.outputPath);
    return { outputPath: valid.outputPath, duration: valid.duration, width: 720, height: 1280, fps: 30, audio: false };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function main() {
  let remoteDir = '';
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options.input) {
      if (!options['offer-url'] && !options['image-url']) throw new Error('Informe --input, --offer-url ou --image-url.');
      remoteDir = await mkdtemp(resolve(tmpdir(), 'radar-offer-source-'));
      const source = await fetchOfferImage({ offerUrl: options['offer-url'], imageUrl: options['image-url'], dir: remoteDir });
      options.input = source.imagePath;
      if (!options.title && source.title) options.title = source.title;
      process.stdout.write(`Imagem obtida: ${source.imageUrl}\nBytes: ${source.bytes}\n`);
    }
    if (!options.title) throw new Error('Informe --title ou use --offer-url para extrair o título da página.');
    const result = await render(options);
    process.stdout.write(`Vídeo renderizado localmente: ${result.outputPath}\nFormato: ${result.width}x${result.height}, ${result.fps} fps, ${result.duration}s, sem áudio.\nNenhuma publicação foi realizada.\n`);
  } catch (error) {
    process.stderr.write(`Erro: ${error.message}\n\nExemplos:\nnode prototypes/offer-video-ffmpeg/render.mjs --offer-url "https://loja.example/oferta" --output ./oferta.mp4\nnode prototypes/offer-video-ffmpeg/render.mjs --image-url "https://cdn.example/produto.jpg" --output ./oferta.mp4 --title "Nome do produto"\n`);
    process.exitCode = 1;
  } finally {
    if (remoteDir) await rm(remoteDir, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
