#!/usr/bin/env node
/**
 * Standalone, local-only prototype for rendering a product-offer video.
 * No network requests, provider APIs, publishing, or Radar runtime imports.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, access } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Argumento inesperado: ${token}`);
    const key = token.slice(2);
    if (!['input', 'output', 'title', 'price', 'cta', 'duration', 'font'].includes(key)) {
      throw new Error(`Argumento não reconhecido: --${key}`);
    }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Informe um valor para --${key}`);
    result[key] = value;
  }
  return result;
}

export function validateOptions(options) {
  const title = String(options.title || '').trim();
  const input = String(options.input || '').trim();
  const output = String(options.output || '').trim();
  const price = String(options.price || '').trim();
  const cta = String(options.cta || 'Confira os detalhes no link da publicação').trim();
  const duration = Number(options.duration ?? 15);

  if (!title || title.length > 120) throw new Error('O título é obrigatório e deve ter até 120 caracteres.');
  if (!input) throw new Error('Informe a imagem local com --input.');
  if (!output) throw new Error('Informe o destino MP4 com --output.');
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extname(input).toLowerCase())) {
    throw new Error('A imagem deve ser PNG, JPG ou WebP.');
  }
  if (extname(output).toLowerCase() !== '.mp4') throw new Error('O arquivo de saída deve terminar em .mp4.');
  if (price.length > 50) throw new Error('O preço deve ter até 50 caracteres.');
  if (!cta || cta.length > 100) throw new Error('A chamada para ação deve ter até 100 caracteres.');
  if (![10, 15, 20, 30].includes(duration)) throw new Error('A duração permitida é 10, 15, 20 ou 30 segundos.');

  const inputPath = resolve(input);
  const outputPath = resolve(output);
  if (inputPath === outputPath) throw new Error('A saída não pode sobrescrever a imagem de entrada.');

  return { inputPath, outputPath, title, price, cta, duration, font: options.font ? resolve(options.font) : '' };
}

function filterPath(value) {
  // FFmpeg filtergraph escaping; paths are passed as an argv item, never through a shell.
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function textFileFilter(file, { font, size, y, color = 'white' }) {
  const fontPart = font ? `fontfile='${filterPath(font)}':` : '';
  return `drawtext=${fontPart}textfile='${filterPath(file)}':expansion=none:fontcolor=${color}:fontsize=${size}:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.7:shadowx=2:shadowy=2`;
}

export function buildFilterGraph({ titleFile, priceFile, ctaFile, font, duration }) {
  const frames = duration * 30;
  const filters = [
    'scale=720:1280:force_original_aspect_ratio=increase',
    'crop=720:1280',
    `zoompan=z='min(zoom+0.00025,1.035)':d=${frames}:s=720x1280:fps=30`,
    'drawbox=x=0:y=100:w=iw:h=270:color=black@0.48:t=fill',
    textFileFilter(titleFile, { font, size: 46, y: 170 }),
    'drawbox=x=0:y=900:w=iw:h=310:color=black@0.58:t=fill',
    ...(priceFile ? [textFileFilter(priceFile, { font, size: 58, y: 960, color: 'white' })] : []),
    textFileFilter(ctaFile, { font, size: 30, y: 1100 }),
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
    '-hide_banner', '-loglevel', 'error', '-y',
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
  const workDir = await mkdtemp(resolve(tmpdir(), 'radar-offer-video-'));
  try {
    const titleFile = resolve(workDir, 'title.txt');
    const priceFile = resolve(workDir, 'price.txt');
    const ctaFile = resolve(workDir, 'cta.txt');
    await Promise.all([
      writeFile(titleFile, valid.title.replace(/[\r\n]+/g, ' ').trim(), 'utf8'),
      writeFile(priceFile, valid.price.replace(/[\r\n]+/g, ' ').trim(), 'utf8'),
      writeFile(ctaFile, valid.cta.replace(/[\r\n]+/g, ' ').trim(), 'utf8')
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
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await render(options);
    process.stdout.write(`Vídeo renderizado localmente: ${result.outputPath}\nFormato: ${result.width}x${result.height}, ${result.fps} fps, ${result.duration}s, sem áudio.\nNenhuma publicação foi realizada.\n`);
  } catch (error) {
    process.stderr.write(`Erro: ${error.message}\n\nExemplo:\nnode prototypes/offer-video-ffmpeg/render.mjs --input ./produto.jpg --output ./oferta.mp4 --title "Nome do produto" --price "R$ 49,90" --duration 15\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
