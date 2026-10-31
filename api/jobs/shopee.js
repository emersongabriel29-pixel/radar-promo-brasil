import { config, db, scheduler } from 'hatchable';
import { fetchWithRetry } from 'lib/http-retry.js';
import { fingerprint } from 'lib/automation.js';
import { directImageUrl, httpsUrl } from 'lib/validation.js';
// API catalog items are not filtered by product category.
import { formatPromo } from 'lib/promo-message.js';
import { cacheOfferImage } from 'lib/offer-images.js';
import { classifyProduct } from 'lib/category-classifier.js';
import { isMedicationProduct } from 'lib/product-safety.js';
import { selectShopeeKeywords, getShopeeKeywordQualityPenalty } from 'lib/shopee-keywords.js';
import { isShopeeShopId, isShopeeItemId } from 'lib/shopee-ids.js';

export const access = 'scheduler';
export const methods = ['POST'];
const API_URL = 'https://open-api.affiliate.shopee.com.br/graphql';
const clean = (v, n=300) => String(v ?? '').trim().slice(0,n);
const fromB64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const list = body => Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
// Database operations are throttled by the per-candidate pause below.

async function credentials(row) {
  // Match the canonical key priority used by the credential-saving endpoint.
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('credential_key_missing');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master+'|radar-marketplace-credentials|'+row.account_id+'|SHOPEE'));
  const key = await crypto.subtle.importKey('raw', digest, {name:'AES-GCM'}, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.nonce)},key,fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function request(creds, query, variables, attempt = 0) {
  const payload = {query, ...(variables ? {variables} : {})};
  const appId = clean(creds.appId,200), secret = clean(creds.apiSecret,4096);
  if (!appId || !secret) throw new Error('credentials_missing');
  const timestamp = String(Math.floor(Date.now()/1000)), body = JSON.stringify(payload);
  const signature = hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(appId+timestamp+body+secret)));
  const response = await fetchWithRetry(API_URL,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',authorization:'SHA256 Credential='+appId+', Timestamp='+timestamp+', Signature='+signature},body,signal:AbortSignal.timeout(12000)});
  const raw = await response.text(); let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('invalid_api_response'); }
  if (!response.ok || data.errors?.length) {
    const code = clean(data.errors?.[0]?.extensions?.code || '',60);
    if (code === '10030' && attempt < 2) {
      await pause(attempt === 0 ? 1200 : 2800);
      return request(creds,query,variables,attempt+1);
    }
    throw new Error('shopee_api_'+(code || response.status));
  }
  return data;
}
async function requestProductPages(creds, query, variables, maxPages = 3) {
  const nodes = [];
  let page = Math.max(1, Number(variables?.page) || 1);
  let hasNextPage = false;
  let pagesFetched = 0;
  do {
    const response = await request(creds,query,{...variables,page});
    const result = response.data?.productOfferV2;
    nodes.push(...list(result?.nodes));
    hasNextPage = Boolean(result?.pageInfo?.hasNextPage);
    pagesFetched++;
    page++;
  } while (hasNextPage && pagesFetched < maxPages);
  return {nodes,pagesFetched,hasNextPage,nextPage:hasNextPage?page:null};
}
async function getShopeeDiscoveryPage(accountId, discoveryKey, sortType) {
  const result = await db.query(
    'SELECT next_page FROM shopee_discovery_cursors WHERE account_id=$1 AND discovery_key=$2 AND sort_type=$3 LIMIT 1',
    [accountId,discoveryKey,sortType]
  );
  return Math.max(1, Number(result.rows[0]?.next_page) || 1);
}
async function saveShopeeDiscoveryPage(accountId, discoveryKey, sortType, result) {
  const nextPage = result.hasNextPage ? result.nextPage : 1;
  await db.query(
    `INSERT INTO shopee_discovery_cursors(account_id,discovery_key,sort_type,next_page,pages_completed,last_page_count,last_has_next_page,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,now())
     ON CONFLICT(account_id,discovery_key,sort_type) DO UPDATE SET
       next_page=EXCLUDED.next_page,
       pages_completed=shopee_discovery_cursors.pages_completed+EXCLUDED.pages_completed,
       last_page_count=EXCLUDED.last_page_count,
       last_has_next_page=EXCLUDED.last_has_next_page,
       updated_at=now()`,
    [accountId,discoveryKey,sortType,nextPage,result.pagesFetched,result.nodes.length,result.hasNextPage]
  );
}
async function createTrackedLink(creds, productUrl, itemId, category) {
  const itemTag = ('ITEM'+clean(itemId,36).replace(/[^a-z0-9]/gi,'')).slice(0,50);
  const categoryTag = ('CAT'+clean(category,30).replace(/[^a-z0-9]/gi,'')).slice(0,50);
  const subIds = ['RADAR',itemTag,categoryTag].filter((value,index,array)=>value.length>3&&array.indexOf(value)===index).slice(0,5);
  const query = 'mutation { generateShortLink(input: { originUrl: '+JSON.stringify(productUrl)+', subIds: '+JSON.stringify(subIds)+' }) { shortLink } }';
  const result = await request(creds,query);
  const shortLink = result?.data?.generateShortLink?.shortLink;
  if (typeof shortLink !== 'string' || !shortLink.startsWith('https://')) throw new Error('shopee_short_link_missing');
  return {shortLink,subIds};
}
export default async function handler(req,res) {
  const dryRun = req.body?.dryRun === true || String(req.body?.dryRun ?? req.query?.dryRun ?? '').toLowerCase() === 'true';
  const rows = (await db.query("SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='SHOPEE' AND status='VALIDATED'")).rows;
  const totals = {accounts:rows.length,scanned:0,imported:0,duplicates:0,skipped:0,safetyBlocked:0,selected:0,failed:0,autopilotRuns:0,preview:[],incompletePreview:[],safetyBlockedPreview:[]};
  for (const row of rows) {
    let importedForAccount = 0;
    try {
      const creds = await credentials(row);
      // Rotate a curated catalog of thousands of product, brand, intent and attribute phrases.
      // Keep each run bounded to protect Shopee quotas; expand discovery across sort modes and partner shops.
      const slot = Math.floor(Date.now()/1800000);
      const selectedKeywords = selectShopeeKeywords(slot,6);
      const productQuery = 'query($keyword: String, $shopId: Int64, $listType: Int, $sortType: Int, $page: Int, $limit: Int, $isAMSOffer: Boolean, $isKeySeller: Boolean) { productOfferV2(keyword: $keyword, shopId: $shopId, listType: $listType, sortType: $sortType, page: $page, limit: $limit, isAMSOffer: $isAMSOffer, isKeySeller: $isKeySeller) { nodes { itemId shopId shopName productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate sales ratingStar } pageInfo { page limit hasNextPage } } }';
      const seen = new Set();
      const products = [];
      const addProducts = (nodes, discoveryKeyword, discoverySource) => {
        for (const product of list(nodes)) {
          const key = clean(product.itemId,80) || clean(product.productLink,2000) || clean(product.productName,220);
          if (!key || seen.has(key)) continue;
          // Keep every unique API result. Search relevance affects ranking only, never inclusion.
          seen.add(key);
          product.__radarKeyword = discoveryKeyword;
          product.__discoverySource = discoverySource;
          products.push(product);
        }
      };
      // Search each selected phrase by sales and commission. Page rotation broadens catalog coverage over time.
      for (const keyword of selectedKeywords) {
        for (const sortType of [2,5]) {
          const listType = sortType === 2 ? 2 : 1;
          const discoveryKey = 'keyword:'+keyword;
          const page = await getShopeeDiscoveryPage(row.account_id,discoveryKey,sortType);
          const result = await requestProductPages(creds,productQuery,{keyword,listType,sortType,page,limit:50},3);
          addProducts(result.nodes,keyword,'keyword');
          if (!dryRun) await saveShopeeDiscoveryPage(row.account_id,discoveryKey,sortType,result);
          totals.productSearchCalls = (totals.productSearchCalls||0)+result.pagesFetched;
          totals.productPagesFetched = (totals.productPagesFetched||0)+result.pagesFetched;
          if (result.hasNextPage) {
            totals.productSearchContinuations = (totals.productSearchContinuations||0)+1;
            totals.paginationIncomplete = true;
          }
        }
      }
      totals.keywordsQueried = (totals.keywordsQueried||0)+selectedKeywords.length;

      // Discover affiliate partner shops, then sample products from the two strongest returned shops.
      // Optional discovery failures must not block the core product search.
      const shopQuery = 'query($sortType: Int, $page: Int, $limit: Int) { shopOfferV2(sortType: $sortType, page: $page, limit: $limit) { nodes { shopId shopName commissionRate ratingStar shopType imageUrl offerLink remainingBudget sellerCommCoveRatio periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
      try {
        const shopData = await request(creds,shopQuery,{sortType:2,page:1,limit:30});
        const shops = list(shopData.data?.shopOfferV2?.nodes);
        totals.shopsDiscovered = (totals.shopsDiscovered||0)+shops.length;
        for (const shop of shops.slice(0,2)) {
          const shopId = clean(shop.shopId,80);
          if (!isShopeeShopId(shopId)) continue;
          try {
            const discoveryKey = 'shop:'+shopId;
            const page = await getShopeeDiscoveryPage(row.account_id,discoveryKey,2);
            const shopProducts = await requestProductPages(creds,productQuery,{shopId,listType:2,sortType:2,page,limit:50},3);
            addProducts(shopProducts.nodes,'loja:'+clean(shop.shopName,80),'partner_shop');
            if (!dryRun) await saveShopeeDiscoveryPage(row.account_id,discoveryKey,2,shopProducts);
            totals.shopProductCalls = (totals.shopProductCalls||0)+shopProducts.pagesFetched;
            totals.productPagesFetched = (totals.productPagesFetched||0)+shopProducts.pagesFetched;
            if (shopProducts.hasNextPage) {
              totals.productSearchContinuations = (totals.productSearchContinuations||0)+1;
              totals.paginationIncomplete = true;
            }
          } catch (shopProductError) {
            console.error('shopee partner shop product discovery skipped',String(shopProductError?.message||'ERROR').slice(0,80));
          }
        }
      } catch (shopError) {
        totals.shopDiscoveryUnavailable = true;
        console.error('shopee partner shop discovery skipped',String(shopError?.message||'ERROR').slice(0,80));
      }

      // Campaigns are discovery intelligence, not product offers: never publish a campaign as if it were a priced item.
      const campaignQuery = 'query($sortType: Int, $page: Int, $limit: Int) { shopeeOfferV2(sortType: $sortType, page: $page, limit: $limit) { nodes { commissionRate imageUrl offerLink originalLink offerName offerType categoryId collectionId periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
      try {
        const campaignData = await request(creds,campaignQuery,{sortType:1,page:1,limit:30});
        const campaigns = list(campaignData.data?.shopeeOfferV2?.nodes);
        const nowSeconds = Math.floor(Date.now()/1000);
        totals.campaignsDiscovered = (totals.campaignsDiscovered||0)+campaigns.filter(item=>(!Number(item.periodStartTime)||Number(item.periodStartTime)<=nowSeconds)&&(!Number(item.periodEndTime)||Number(item.periodEndTime)>=nowSeconds)).length;
      } catch (campaignError) {
        totals.campaignDiscoveryUnavailable = true;
        console.error('shopee campaign discovery skipped',String(campaignError?.message||'ERROR').slice(0,80));
      }

      // The live Brazil GraphQL schema exposes only deprecated brandOffer; brandOfferV2
      // is not a Query field for these credentials. Do not call the deprecated endpoint.
      totals.brandOfferDiscoveryUnavailable = true;
      totals.brandOfferDiscoveryReason = 'brand_offer_v2_not_exposed_by_live_brazil_schema';
      totals.scanned += products.length;
      const cats = (await db.query('SELECT id,name FROM categories WHERE account_id=$1',[row.account_id])).rows;
      const candidates = [];
      for (const p of products) {
        const title = clean(p.productName,220);
        const productUrl = httpsUrl(p.productLink,2000) || '';
        if (isMedicationProduct({title, productUrl})) { totals.safetyBlocked++; totals.skipped++; totals.safetyBlockedPreview.push({itemId:clean(p.itemId,80),title,discoveryKeyword:clean(p.__radarKeyword,80),reason:'blocked_by_product_safety_policy'}); continue; }
        const affiliateUrl = httpsUrl(p.offerLink,2000) || '';
        const imageUrl = directImageUrl(p.imageUrl) ? p.imageUrl : '';
        const price = Number(p.priceMin);
        const rateRaw = Number(p.priceDiscountRate);
        const discountRate = Number.isFinite(rateRaw) && rateRaw > 0 ? (rateRaw < 1 ? rateRaw : rateRaw/100) : 0;
        const currentPrice = Number.isFinite(price) && price>0 ? Math.round(price*100) : 0;
        const commission = Number(p.commissionRate);
        const missingFields = [];
        if (!title) missingFields.push('title');
        if (!productUrl) missingFields.push('productUrl');
        if (!affiliateUrl) missingFields.push('affiliateUrl');
        if (!imageUrl) missingFields.push('imageUrl');
        if (!currentPrice) missingFields.push('priceMin');
        if (!Number.isFinite(commission) || commission<=0) missingFields.push('commissionRate');
        if (missingFields.length) {
          totals.skipped++;
          totals.incompletePreview.push({itemId:clean(p.itemId,80),title,shopId:clean(p.shopId,80),shopName:clean(p.shopName,160),discoverySource:p.__discoverySource,discoveryKeyword:clean(p.__radarKeyword,80),missingFields,priceMin:p.priceMin??null,commissionRate:p.commissionRate??null});
          continue;
        }

        const sales = Math.max(0, Number(p.sales) || 0);
        const commissionPercent = commission <= 1 ? commission * 100 : commission;
        const ratingRaw = Number(p.ratingStar);
        const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? (ratingRaw > 5 ? ratingRaw / 20 : ratingRaw) : null;
        const classified = classifyProduct({title});
        // API discount is a marketing claim, not historical proof. Use it only as a ranking signal;
        // never synthesize an original price or publish an unverified percentage as confirmed savings.
        let score = 35;
        score += Math.min(20, discountRate * 40);
        score += Math.min(10, commissionPercent * 0.8);
        score += sales >= 1000 ? 15 : sales >= 100 ? 10 : sales >= 20 ? 5 : 0;
        score += rating === null ? -2 : rating >= 4.7 ? 8 : rating >= 4.4 ? 6 : rating >= 4.0 ? 3 : rating >= 3.5 ? 0 : -8;
        score += title.length >= 18 ? 3 : 0;
        score += classified.confidence >= 0.8 ? 8 : classified.confidence >= 0.5 ? 0 : -12;
        const keywordQualityPenalty = getShopeeKeywordQualityPenalty(title,p.__radarKeyword);
        score += keywordQualityPenalty;
        score += productUrl && affiliateUrl && imageUrl ? 6 : 0;
        score = Math.max(0, Math.min(100, Math.round(score)));
        const reasons = [];
        if (discountRate > 0) reasons.push('desconto anunciado pela API (não confirmado por histórico)');
        if (commissionPercent > 0) reasons.push('comissão informada pela Shopee');
        if (sales >= 20) reasons.push('popularidade informada pela Shopee');
        if (rating !== null) reasons.push('avaliação Shopee: ' + rating.toFixed(1) + '/5');
        if (classified.confidence < 0.5) reasons.push('classificação incerta: exige revisão');
        if (keywordQualityPenalty < 0) reasons.push('produto acessório rebaixado em busca de produto principal');
        if (productUrl && affiliateUrl && imageUrl) reasons.push('link, link de afiliado e imagem presentes');
        const fp = await fingerprint({source:'SHOPEE',externalId:clean(p.itemId,80),productUrl,title});
        const category = cats.find(c=>c.name.toLowerCase()===String(classified.category||'').toLowerCase()) || cats.find(c=>c.name.toLowerCase().includes('gerais'));
        candidates.push({p,title,productUrl,affiliateUrl,imageUrl,currentPrice,commissionPercent,discountRate,sales,score,reasons,fp,classified,category,id:clean(p.itemId,80),merchantId:clean(p.shopId,80),merchantName:clean(p.shopName,160)});
      }

      // Rank the full candidate batch first; the cap applies only after comparison and duplicate checks.
      candidates.sort((a,b) => b.score-a.score || b.sales-a.sales || b.commissionPercent-a.commissionPercent || a.currentPrice-b.currentPrice || a.title.localeCompare(b.title,'pt-BR'));
      // Priority only: retain the complete candidate set, including low-volume and accessory matches.
      const selectedCandidates = candidates;
      totals.selected += selectedCandidates.length;
      totals.candidatesRetained = (totals.candidatesRetained || 0) + selectedCandidates.length;
      if (dryRun) {
        totals.preview.push(...selectedCandidates.map(candidate => ({itemId:clean(candidate.p.itemId,80),title:candidate.title,category:candidate.classified.category,subcategory:candidate.classified.subcategory,confidence:candidate.classified.confidence,score:candidate.score,sales:candidate.sales,rating:candidate.p.ratingStar==null?null:Number(candidate.p.ratingStar),commissionPercent:candidate.commissionPercent,discountRate:candidate.discountRate,shopId:clean(candidate.p.shopId,80),shopName:clean(candidate.p.shopName,160),price:candidate.currentPrice/100,discoverySource:candidate.p.__discoverySource,discoveryKeyword:clean(candidate.p.__radarKeyword,80)})));
        continue;
      }
      for (const candidate of selectedCandidates) {
        await pause(250);
        const {p,title,productUrl,affiliateUrl,imageUrl,currentPrice,score,fp,classified,category,reasons} = candidate;
        const exists = await db.query('SELECT id,current_price,original_price FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1',[row.account_id,fp]);
        if (exists.rows.length) {
          const existing = exists.rows[0];
          if (imageUrl) {
            await db.query("UPDATE offers SET image_url=$1,updated_at=now() WHERE id=$2 AND account_id=$3 AND source='SHOPEE' AND status IN ('PENDING','APPROVED','PUBLISHED')",[imageUrl,existing.id,row.account_id]);
            await db.query("UPDATE publications SET image_url=$1 WHERE account_id=$2 AND offer_id=$3 AND status IN ('READY','RETRY')",[imageUrl,row.account_id,existing.id]);
          }
          if (Number(existing.current_price)===currentPrice && existing.original_price===null) {
            await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,NULL,'OFFICIAL_API',$5,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours' AND price=$4 AND original_price IS NULL)",[crypto.randomUUID(),row.account_id,existing.id,currentPrice,'SHOPEE:'+clean(p.itemId,80)]);
          }
          totals.duplicates++; continue;
        }
        let trackedAffiliateUrl = affiliateUrl;
        let subIdNote = 'sub_ids_generation_failed';
        try {
          const tracked = await createTrackedLink(creds,productUrl,p.itemId,category?.name||classified.category||'GERAIS');
          trackedAffiliateUrl = tracked.shortLink;
          subIdNote = 'shopee_sub_ids='+tracked.subIds.join(',');
        } catch (linkError) {
          console.error('shopee tracked link fallback',String(linkError?.message||'ERROR').slice(0,80));
        }
        // Do not fabricate an original price from the advertised discount. Until historical evidence exists,
        // store no original price and publish no unverified % OFF.
        const originalPrice = null;
        const discount = 0;
        const promo = formatPromo({title,source:'SHOPEE',category:category?.name||'',currentPrice,originalPrice:0,affiliateUrl:trackedAffiliateUrl,imageUrl});
        const offerId = crypto.randomUUID();
        const inserted = await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible) VALUES($1,$2,$3,'SHOPEE',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'APPROVED',$12,$13,'VALIDATED','AUTO',false) ON CONFLICT DO NOTHING RETURNING id",[offerId,row.account_id,title,originalPrice,currentPrice,category?.id||null,trackedAffiliateUrl,imageUrl,productUrl,discount,score,promo.message,fp]);
        if (!inserted.rows.length) { totals.duplicates++; continue; }
        try {
          await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())",[crypto.randomUUID(),row.account_id,offerId,currentPrice,originalPrice,'SHOPEE:'+clean(p.itemId,80)]);
          const scoreReason = 'radar_score='+score+'; '+reasons.join('; ')+'; '+subIdNote;
          await db.query('UPDATE offers SET subcategory=$1,classification_tags=$2::jsonb,classification_confidence=$3,classification_status=$4,classification_reason=$5,source_category=$6 WHERE id=$7 AND account_id=$8',[classified.subcategory,JSON.stringify(classified.tags||[]),classified.confidence||0,classified.needsReview?'REVIEW':'AUTO',(classified.reason||'official_shopee_api')+'; '+scoreReason+'; discovery_keyword='+clean(p.__radarKeyword,80),null,offerId,row.account_id]);
          totals.imported++; importedForAccount++;
        } catch (e) {
          await db.query("UPDATE offers SET status='PENDING',validation_status='NEEDS_REVIEW' WHERE id=$1 AND account_id=$2",[offerId,row.account_id]);
          totals.failed++;
        }
      }
      // Reconcile a small number of previously queued Shopee offers by their exact item ID.
      // Search results are accepted only when the official API returns the same item ID.
      const staleOffers = (await db.query(`
        SELECT o.id,o.title,o.product_url,o.current_price,o.affiliate_url
        FROM offers o
        WHERE o.account_id=$1 AND o.source='SHOPEE' AND o.status IN ('APPROVED','PUBLISHED')
          AND o.validation_status='VALIDATED'
          AND EXISTS(SELECT 1 FROM publications p WHERE p.account_id=o.account_id AND p.offer_id=o.id
            AND p.status IN ('RETRY','FAILED') AND p.external_message_id IS NULL
            AND (p.error_message ILIKE '%preço oficial%' OR p.error_message ILIKE '%validação oficial%'))
          AND NOT EXISTS(SELECT 1 FROM offer_price_history h WHERE h.account_id=o.account_id AND h.offer_id=o.id
            AND h.source_type='OFFICIAL_API' AND h.verified_at>now()-interval '24 hours'
            AND h.price=o.current_price AND h.original_price IS NOT DISTINCT FROM o.original_price
            AND h.verified_at=(SELECT max(h2.verified_at) FROM offer_price_history h2
              WHERE h2.account_id=h.account_id AND h2.offer_id=h.offer_id AND h2.source_type='OFFICIAL_API'))
        ORDER BY o.updated_at,o.id LIMIT 3
      `,[row.account_id])).rows;
      const reconcileQuery = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { itemId productName productLink offerLink imageUrl priceMin } } }';
      for (const stale of staleOffers) {
        try {
          const parts = new URL(stale.product_url).pathname.split('/').filter(Boolean);
          const itemId = parts[parts.length-1];
          if (!isShopeeItemId(itemId)) continue;
          const found = list((await request(creds,reconcileQuery,{keyword:clean(stale.title,120),sortType:5,page:1,limit:50})).data?.productOfferV2?.nodes)
            .find(product=>String(product.itemId)===itemId);
          const livePrice = Math.round(Number(found?.priceMin)*100);
          const liveImage = directImageUrl(found?.imageUrl) ? found.imageUrl : '';
          if (!found || !Number.isSafeInteger(livePrice) || livePrice<=0 || !liveImage) continue;
          const affiliate = httpsUrl(found.offerLink,2000) || stale.affiliate_url;
          await cacheOfferImage({imageUrl:liveImage,accountId:row.account_id,offerId:stale.id},db);
          const promo = formatPromo({title:stale.title,source:'SHOPEE',currentPrice:livePrice,originalPrice:0,affiliateUrl:affiliate,imageUrl:liveImage});
          await db.query("UPDATE offers SET current_price=$1,original_price=NULL,discount_percent=0,affiliate_url=$2,image_url=$3,message=$4,updated_at=now() WHERE id=$5 AND account_id=$6 AND source='SHOPEE'",[livePrice,affiliate,liveImage,promo.message,stale.id,row.account_id]);
          await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,NULL,'OFFICIAL_API',$5,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours' AND price=$4 AND original_price IS NULL)",[crypto.randomUUID(),row.account_id,stale.id,livePrice,'SHOPEE:'+itemId]);
          await db.query("UPDATE publications SET status='RETRY',attempts=0,error_message=NULL,next_attempt_at=now(),image_url=$3,image_storage_key=(SELECT image_storage_key FROM offers WHERE id=$2 AND account_id=$1),dispatch_token=NULL,telegram_connection_id=NULL WHERE account_id=$1 AND offer_id=$2 AND status IN ('RETRY','FAILED') AND external_message_id IS NULL AND (error_message ILIKE '%preço oficial%' OR error_message ILIKE '%validação oficial%')",[row.account_id,stale.id,liveImage]);
          totals.reconciled = (totals.reconciled||0)+1;
        } catch(error) {
          console.error('shopee price reconciliation skipped',String(error?.message||error?.code||'ERROR').slice(0,80));
        }
      }
      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'",[row.account_id]);
      if (importedForAccount) {
        try { await scheduler.now('/api/jobs/autopilot'); totals.autopilotRuns++; }
        catch (e) { console.error('shopee autopilot trigger failed',String(e?.code||e?.name||'ERROR').slice(0,60)); }
      }
    } catch (e) {
      totals.failed++;
      const code = String(e?.message||'').slice(0,100);
      if (!dryRun) await db.query("UPDATE marketplace_api_credentials SET last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'",[row.account_id,code]);
      console.error('shopee ingestion failed',code);
    }
  }
  return res.json({ok:totals.failed===0,dryRun,publicationEnabled:!dryRun,...totals,note:dryRun?'Prévia somente leitura: nenhum link foi criado, nenhuma oferta foi gravada e nenhuma publicação foi acionada.':'A importação e a fila são automáticas; somente produtos com preço/desconto, imagem, link de afiliado e comissão válidos entram no fluxo. Publicação depende das regras e destinos ativos da conta.'});
}