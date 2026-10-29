import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { render } from './render.mjs';

test('renders a real MP4 with FFmpeg and verifies its media metadata', { skip: process.env.RUN_FFMPEG_INTEGRATION !== '1' }, async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'radar-ffmpeg-integration-'));
  const input = resolve(dir, 'fixture.png');
  const output = resolve(dir, 'rendered.mp4');
  try {
    // Minimal valid 1x1 PNG fixture; no real product or offer data is used.
    await (await import('node:fs/promises')).writeFile(
      input,
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0WQAAAAASUVORK5CYII=', 'base64')
    );
    const result = await render({
      input,
      output,
      title: 'Fixture de teste',
      price: 'R$ 1,00',
      cta: 'Teste local sem publicação',
      duration: 10
    });
    assert.equal(result.width, 720);
    assert.equal(result.height, 1280);
    assert.equal(result.fps, 30);
    assert.equal(result.duration, 10);
    assert.equal(result.audio, false);
    assert.ok((await stat(output)).size > 1000);

    const metadata = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
      '-of', 'json', output
    ], { encoding: 'utf8' }));
    const video = metadata.streams.find(stream => stream.codec_type === 'video');
    assert.ok(video, 'MP4 must contain a video stream');
    assert.equal(video.codec_name, 'h264');
    assert.equal(video.width, 720);
    assert.equal(video.height, 1280);
    assert.equal(video.r_frame_rate, '30/1');
    assert.equal(metadata.streams.some(stream => stream.codec_type === 'audio'), false);
    assert.ok(Number(metadata.format.duration) >= 9.9 && Number(metadata.format.duration) <= 10.2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
