import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShopeeDatafeedId } from '../lib/shopee-feed.js';

test('normalizes the date format returned by listItemFeeds to getItemFeedData format', () => {
  assert.equal(normalizeShopeeDatafeedId('428536169534861312_FULL_2026-10-29'), '428536169534861312_FULL_20261029');
  assert.equal(normalizeShopeeDatafeedId('428536169534861312_DELTA_20261029'), '428536169534861312_DELTA_20261029');
});

test('rejects incomplete IDs and impossible dates', () => {
  assert.equal(normalizeShopeeDatafeedId('428536169534861312'), null);
  assert.equal(normalizeShopeeDatafeedId('428536169534861312_FULL_2026-02-30'), null);
  assert.equal(normalizeShopeeDatafeedId('../428536169534861312_FULL_20261029'), null);
});
