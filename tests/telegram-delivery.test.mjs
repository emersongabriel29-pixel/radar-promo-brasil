import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { offerImage } from '../lib/offer-images.js';

const [scheduledWorker, n8nWorker] = await Promise.all([
  readFile('api/jobs/telegram.js', 'utf8'),
  readFile('api/n8n/telegram-tick.js', 'utf8')
]);

test('scheduled Telegram dispatch uses an explicitly public image URL for an approved delivery', () => {
  assert.match(scheduledWorker, /offerImage\(item,\s*\{\s*publicAccess:\s*true\s*\}\)/);
  assert.match(scheduledWorker, /sendTelegramOffer\(token/);
  assert.equal(offerImage({ id: 'approved-offer', imageStorageKey: 'products/account/image.jpg' }, { publicAccess: true }), '/api/public/media/approved-offer');
});

test('n8n Telegram dispatch also uses the gated public media route', () => {
  assert.match(n8nWorker, /offerImage\(item,\s*\{\s*publicAccess:\s*true\s*\}\)/);
  assert.match(n8nWorker, /sendTelegramOffer\(token/);
});

test('private media remains the default outside an authorized publication', () => {
  assert.equal(offerImage({ id: 'draft-offer', imageStorageKey: 'products/account/image.jpg' }), '/api/media/offer/draft-offer');
});
