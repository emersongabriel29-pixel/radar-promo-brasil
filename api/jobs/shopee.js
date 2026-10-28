import { config, db, scheduler } from 'hatchable';
import { fingerprint, message as promoMessage, offerScore } from 'lib/automation.js';
import { directImageUrl } from 'lib/validation.js';

export const access = 'scheduler';
export const methods = ['POST'];

const API_URL = 'https://open-api.affiliate.shopee.com.br/graphql';
const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const list = value => Array.isArray(value) ? value : [];

function priceCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return NaN;
  return Number.isInteger(number) ? number * 100 : Math.round(number * 100);
}

function discountPercent(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(99, Math.round(raw > 0 && raw < 1 ? raw * 100 : raw));
}

async function readCredentials(row) {
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('Chave mestra de credenciais ausente');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + row.account_id + '|SHOPEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function signedRequest(credentials, payload) {
  const appId = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  if (!appId || !secret) throw new Error('Credenciais Shopee incompletas');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify(payload);
  const signature = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(appId + timestamp + body + secret)));
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: 'SHA256 Credential=' + appId + ', Timestamp=' + timestamp + ', Signature=' + signature
    },
    body,
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error('A API Shopee retornou resposta não JSON'); }
  if (!response.ok || (Array.isArray(result.errors) && result.errors.length)) {
    throw Object.assign(new Error(clean(result?.errors?.[0]?.message || 'A API Shopee recusou a consulta', 250)), {
      status: response.status,
      apiCode: clean(result?.errors?.[0]?.extensions?.code || '', 60)
    });
  }
  return result;
}

export default async function handler(req, res) {
  const credentialsRows = (await db.query(
    "SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='SHOPEE' AND status='VALIDATED'"
  )).rows;
  const totals = {
    ok: true, accounts: credentialsRows.length, scanned: 0, imported: 0,
    duplicates: 0, skipped: 0, failed: 0, autopilotRuns: 0,
    skipReasons: { missingTitle: 0, missingAffiliateLink: 0, missingProductUrl: 0, missingImage: 0, invalidPrice: 0, noDiscount: 0 }
  };

  for (const row of credentialsRows) {
    let accountImported = 0;
    try {
      const credentials = await readCredentials(row);
      // Follow the official API's pagination until it reports no more pages.
      // Page size is capped at the documented endpoint maximum; no arbitrary product-count cap is applied.
      const query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int, $listType: Int) { productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit, listType: $listType) { nodes { itemId shopId shopName productName productLink offerLink imageUrl priceMin priceDiscountRate commissionRate sales ratingStar } pageInfo { page limit hasNextPage } } }';
      let page = 1;
      let hasNextPage = true;
      while (hasNextPage) {
        const response = await signedRequest(credentials, { query, variables: { keyword: '', sortType: 5, page, limit: 500, listType: 0 } });
        const root = response?.data?.productOfferV2 || {};
        const products = list(root.nodes);
        totals.scanned += products.length;

        for (const product of products) {
          const title = clean(product.productName || product.shopName, 220);
          const affiliateUrl = clean(product.offerLink, 2000);
          const productUrl = clean(product.productLink, 2000);
          const imageUrl = clean(product.imageUrl, 2000);
          const currentPrice = priceCents(product.priceMin);
          const discount = discountPercent(product.priceDiscountRate);
          const originalPrice = discount > 0 && Number.isSafeInteger(currentPrice)
            ? Math.round(currentPrice / (1 - discount / 100))
            : NaN;

          if (!title) { totals.skipped++; totals.skipReasons.missingTitle++; continue; }
          if (!/^https:\/\//i.test(affiliateUrl)) { totals.skipped++; totals.skipReasons.missingAffiliateLink++; continue; }
          if (!/^https:\/\//i.test(productUrl)) { totals.skipped++; totals.skipReasons.missingProductUrl++; continue; }
          if (!directImageUrl(imageUrl)) { totals.skipped++; totals.skipReasons.missingImage++; continue; }
          if (!Number.isSafeInteger(currentPrice) || !Number.isSafeInteger(originalPrice) || currentPrice <= 0 || originalPrice <= currentPrice) {
            totals.skipped++; totals.skipReasons.invalidPrice++; continue;
          }
          if (!discount) { totals.skipped++; totals.skipReasons.noDiscount++; continue; }

          const externalId = clean(product.itemId, 120);
          const fp = await fingerprint({ source: 'SHOPEE', externalId, productUrl, title });
          const score = offerScore({ title, currentPrice, originalPrice });
          const message = promoMessage({ title, source: 'SHOPEE', currentPrice, originalPrice, affiliateUrl, imageUrl, productUrl });
          const inserted = await db.query(
            "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible) VALUES($1,$2,$3,'SHOPEE',$4,$5,NULL,$6,$7,$8,NULL,NULL,$9,$10,'APPROVED',$11,$12,'VALIDATED','AUTO',false) ON CONFLICT DO NOTHING RETURNING id",
            [crypto.randomUUID(), row.account_id, title, originalPrice, currentPrice, affiliateUrl, imageUrl, productUrl, discount, score, message, fp]
          );
          if (!inserted.rows.length) { totals.duplicates++; continue; }

          const offerId = inserted.rows[0].id;
          try {
            await db.query(
              "INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())",
              [crypto.randomUUID(), row.account_id, offerId, currentPrice, originalPrice, 'SHOPEE:' + (externalId || 'unknown')]
            );
            totals.imported++;
            accountImported++;
          } catch (historyError) {
            await db.query("UPDATE offers SET status='PENDING',validation_status='NEEDS_REVIEW' WHERE id=$1 AND account_id=$2", [offerId, row.account_id]);
            totals.failed++;
            console.error('shopee price history failed', String(historyError?.code || historyError?.name || 'ERROR').slice(0, 60));
          }
        }

        hasNextPage = Boolean(root.pageInfo?.hasNextPage) && products.length > 0;
        page = Number(root.pageInfo?.page) > 0 ? Number(root.pageInfo.page) + 1 : page + 1;
      }
      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'", [row.account_id]);
      if (accountImported) {
        try { await scheduler.now('/api/jobs/autopilot'); totals.autopilotRuns++; }
        catch (error) { console.error('shopee autopilot trigger failed', String(error?.code || error?.name || 'ERROR').slice(0, 60)); }
      }
    } catch (error) {
      totals.failed++;
      const code = Number(error?.status) || 0;
      const safeError = code === 401 ? 'Shopee API recusou a autenticação (HTTP 401).' :
        code === 429 ? 'Limite real da API Shopee atingido; nova tentativa na próxima execução.' :
        'Falha de conexão, credenciais ou resposta da API Shopee.';
      await db.query("UPDATE marketplace_api_credentials SET last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'", [row.account_id, safeError]);
      console.error('shopee ingestion failed', String(code || error?.apiCode || error?.name || 'ERROR').slice(0, 60));
    }
  }
  totals.ok = totals.failed === 0;
  return res.json(totals);
}
