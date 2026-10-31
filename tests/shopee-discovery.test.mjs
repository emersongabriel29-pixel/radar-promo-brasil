import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isShopeeShopId, isShopeeItemId } from '../lib/shopee-ids.js';
import { getShopeeKeywordFamily, selectShopeeKeywords } from '../lib/shopee-keywords.js';
import { classifyProduct } from '../lib/category-classifier.js';

test('Shopee shop and item IDs accept decimal Int64 strings without numeric coercion', () => {
  assert.equal(isShopeeShopId('1724979106'), true);
  assert.equal(isShopeeShopId('001724979106'), true);
  assert.equal(isShopeeShopId('1724979106x'), false);
  assert.equal(isShopeeShopId(''), false);
  assert.equal(isShopeeItemId('1589295236'), true);
  assert.equal(isShopeeItemId('1234567'), false);
  assert.equal(isShopeeItemId('9223372036854775807'), true);
  assert.equal(isShopeeItemId('9223372036854775808'), false);
});

test('pajama titles map to the fashion family', () => {
  const result = classifyProduct({ title: 'Pijama Feminino de Algodão' });
  assert.equal(result.category, 'Moda e beleza');
  assert.ok(result.confidence >= 0.8);
});

test('rotating search phrases span product families', () => {
  assert.equal(getShopeeKeywordFamily('top vendas pijama'), 'fashion');
  assert.equal(getShopeeKeywordFamily('oferta mouse sem fio'), 'technology');
  assert.equal(getShopeeKeywordFamily('oferta air fryer'), 'home');
  const selected = selectShopeeKeywords(100, 3);
  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map(getShopeeKeywordFamily)).size, 3);
});

test('expanded category classifier recognizes automotive, office, garden and photography', async () => {
  const cases = [
    ['Pneu aro 15', 'Automotivo'],
    ['Impressora tanque de tinta', 'Informática e escritório'],
    ['Kit jardinagem com tesoura de poda', 'Jardim e construção'],
    ['Drone com câmera 4K', 'Fotografia e drones'],
    ['Caderno inteligente', 'Papelaria e artesanato']
  ];
  for (const [title, category] of cases) assert.equal(classifyProduct({ title }).category, category);
});

test('Shopee discovery ranks every unique API result without relevance or batch caps', async () => {
  const source = await readFile(new URL('../api/jobs/shopee.js', import.meta.url), 'utf8');
  assert.match(source, /const selectedCandidates = candidates;/);
  assert.match(source, /incompletePreview\.push/);
  assert.match(source, /safetyBlockedPreview\.push/);
  assert.match(source, /if \(!dryRun\) await db\.query/);
  assert.doesNotMatch(source, /isRelevantShopeeProduct/);
  assert.doesNotMatch(source, /checkedCandidates >= 15/);
  assert.match(source, /selectShopeeKeywords\(slot,6\)/);
});

test('Shopee product discovery paginates and reports when the bounded page window continues', async () => {
  const source = await readFile(new URL('../api/jobs/shopee.js', import.meta.url), 'utf8');
  assert.match(source, /async function requestProductPages/);
  assert.match(source, /requestProductPages\(creds,productQuery/);
  assert.match(source, /sellerCommissionRate shopeeCommissionRate commission/);
  assert.match(source, /isAMSOffer:true/);
  assert.match(source, /addProducts\(result\.nodes,keyword,'ams_keyword'\)/);
  assert.match(source, /existing\.__isAMSOffer = true/);
  assert.match(source, /getShopeeDiscoveryPage\(row\.account_id,discoveryKey,sortType\)/);
  assert.match(source, /saveShopeeDiscoveryPage\(row\.account_id,discoveryKey,sortType,result\)/);
  assert.match(source, /saveShopeeDiscoveryPage\(row\.account_id,discoveryKey,2,shopProducts\)/);
  assert.match(source, /result\.hasNextPage/);
  assert.match(source, /totals\.paginationIncomplete = true/);
  assert.match(source, /brand_offer_v2_not_exposed_by_live_brazil_schema/);
  assert.doesNotMatch(source, /list\(nodes\)\.slice\(0,50\)/);
  assert.match(source, /clean\(product\.shopId,80\),clean\(product\.productName,220\)/);
  assert.match(source, /persistShopeeDiscoveryItems\(row\.account_id,products\)/);
  assert.match(source, /INSERT INTO affiliate_discovery_items/);
  assert.match(source, /jsonb_to_recordset\(\$2::jsonb\)/);
  assert.match(source, /processing_status IN \('DISCOVERED','FAILED'\)/);
  assert.match(source, /processingBatch/);
  assert.match(source, /LIMIT 30/);
  assert.match(source, /processing_status='IMPORTED'/);
  assert.match(source, /processing_status='DUPLICATE'/);
  assert.match(source, /processing_status='FAILED'/);
  assert.match(source, /discoveryItemsStored/);
  assert.match(source, /incompleteStored/);
  assert.match(source, /discoveryStats\.safetyBlockedPreview/);
  assert.match(source, /if \(!dryRun\) await saveShopeeDiscoveryPage/);
  assert.doesNotMatch(source, /brandOfferV2\(/);
  assert.doesNotMatch(source, /brandOffer\(/);
  assert.match(source, /categoryId collectionId/);
  assert.doesNotMatch(source, /catId collectionLabelId productLabelId productScope/);
});

test('Shopee pagination cursor migration stores independent progress per account, query and sort', async () => {
  const migration = await readFile(new URL('../migrations/058_shopee_discovery_cursors.sql', import.meta.url), 'utf8');
  assert.match(migration, /PRIMARY KEY \(account_id, discovery_key, sort_type\)/);
  assert.match(migration, /next_page integer NOT NULL DEFAULT 1/);
  assert.match(migration, /CHECK \(next_page >= 1\)/);
});

test('Shopee discovery processing migration creates a durable pending queue', async () => {
  const migration = await readFile(new URL('../migrations/059_shopee_discovery_processing_queue.sql', import.meta.url), 'utf8');
  assert.match(migration, /processing_status text NOT NULL DEFAULT 'DISCOVERED'/);
  assert.match(migration, /processed_at timestamptz/);
  assert.match(migration, /offer_id text/);
  assert.match(migration, /processing_status IN \('DISCOVERED','FAILED'\)/);
});
