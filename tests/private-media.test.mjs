import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { offerImage } from '../lib/offer-images.js';

test('stored offer images use the private media proxy without exposing storage keys', async () => {
  const key = 'tests/private-media/' + crypto.randomUUID() + '.jpg';
  const fullPath = path.resolve(process.cwd(), 'public', 'uploads', key);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, Buffer.from('test-image'));
  try {
    assert.equal(offerImage({ id: 'offer-1', imageStorageKey: key }), '/api/media/offer/offer-1');
    assert.equal(offerImage({ id: 'offer-1', imageStorageKey: key }, { publicAccess: true }), '/api/public/media/offer-1');
  } finally {
    rmSync(path.dirname(fullPath), { recursive: true, force: true });
  }
});

test('external image URLs remain unchanged', async () => {
  const url = 'https://cdn.example.com/a.jpg';
  assert.equal(offerImage({ id: 'offer-1', imageUrl: url }), url);
});
