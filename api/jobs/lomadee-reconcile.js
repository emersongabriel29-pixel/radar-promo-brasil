import { db } from 'hatchable';
import { message as promoMessage, offerScore } from 'lib/automation.js';
import { getLomadeeActiveLinks, listLomadeeRows, lomadeeGet, lomadeeProductPrices, normalizeLomadeeProductUrl } from 'lib/lomadee-api.js';

export const access = 'scheduler';
export const schedule = '0 * * * *';
export const methods = ['POST'];

const clean = (value, max = 220) => String(value ?? '').trim().slice(0, max);
const decodeHtml = value => String(value || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => { const n = parseInt(hex, 16); return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : ' '; })
  .replace(/&#(\d+);/g, (_, dec) => { const n = Number(dec); return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : ' '; })
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&nbsp;/gi, ' ');

export default async function handler(req, res) {
  const credentials = (await db.query(
    "SELECT account_id,status FROM marketplace_api_credentials WHERE marketplace='LOMADEE' AND status IN ('READ_ONLY_VALIDATED','LINKS_READ_VALIDATED','VALIDATED') ORDER BY updated_at"
  )).rows;
  const totals = { ok: true, accounts: credentials.length, activeLinksListed: 0, existingOffers: 0, linksVerified: 0, checked: 0, pricesVerified: 0, priceMismatch: 0, productNotFound: 0, blockedMedication: 0, offersNeedsReview: 0, skippedRecent: 0, failed: 0, details: [] };

  for (const credential of credentials) {
    const accountId = credential.account_id;
    try {
      const linkData = await getLomadeeActiveLinks(accountId);
      totals.activeLinksListed += linkData.links.size;
      // Keep the all-offer link audit narrow; run the price-history EXISTS only for the 10-row work batch.
      const offerLinks = (await db.query(
        "SELECT affiliate_url FROM offers WHERE account_id=$1 AND source='LOMADEE' AND status IN ('APPROVED','PUBLISHED')",
        [accountId]
      )).rows;
      const totalOffers = offerLinks.length;
      const verifiedLinks = offerLinks.filter(offer => linkData.links.has(String(offer.affiliate_url || ''))).length;
      totals.existingOffers += totalOffers;
      totals.linksVerified += verifiedLinks;
      const allLinksVerified = totalOffers > 0 && verifiedLinks === totalOffers;
      if (allLinksVerified && credential.status !== 'VALIDATED') {
        await db.query(
          "UPDATE marketplace_api_credentials SET status='LINKS_READ_VALIDATED',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE' AND status<>'VALIDATED'",
          [accountId, 'Links de afiliado existentes confirmados ativos pela API oficial. A geração de novos links não foi validada; importação automática permanece bloqueada.']
        );
      } else {
        await db.query(
          "UPDATE marketplace_api_credentials SET last_checked_at=now(),updated_at=now() WHERE account_id=$1 AND marketplace='LOMADEE'",
          [accountId]
        );
      }

      const requestedOffset = Number(req.body?.offset);
      const groups = Math.max(1, Math.ceil(totalOffers / 10));
      const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 && requestedOffset < totalOffers
        ? requestedOffset
        : (Math.floor(Date.now() / 3600000) % groups) * 10;
      const batch = totalOffers ? (await db.query(
        "SELECT o.id,o.account_id,o.title,o.current_price AS \"currentPrice\",o.original_price AS \"originalPrice\",o.product_url AS \"productUrl\",o.affiliate_url AS \"affiliateUrl\",o.image_url AS \"imageUrl\",o.coupon_url AS \"couponUrl\",o.coupon_code AS \"couponCode\",o.source_category AS \"sourceCategory\",o.subcategory,o.classification_tags AS \"classificationTags\",o.status,o.created_at AS \"createdAt\",EXISTS(SELECT 1 FROM offer_price_history ph WHERE ph.account_id=o.account_id AND ph.offer_id=o.id AND ph.source_type='OFFICIAL_API' AND ph.verified_at>now()-interval '24 hours') AS \"recentlyVerified\" FROM offers o WHERE o.account_id=$1 AND o.source='LOMADEE' AND o.status IN ('APPROVED','PUBLISHED') ORDER BY o.created_at,o.id LIMIT 10 OFFSET $2",
        [accountId, offset]
      )).rows : [];

      for (const offer of batch) {
        if (!linkData.links.has(String(offer.affiliateUrl || ''))) continue;
        if (offer.recentlyVerified) { totals.skippedRecent++; continue; }
        totals.checked++;
        try {
          const search = decodeHtml(offer.title).slice(0, 100);
          const productBody = await lomadeeGet(accountId, '/affiliate/products', { page: 1, limit: 50, search });
          const products = listLomadeeRows(productBody);
          const expectedUrl = normalizeLomadeeProductUrl(offer.productUrl);
          const match = products.find(product => normalizeLomadeeProductUrl(product?.url) === expectedUrl && expectedUrl);
          if (!match) {
            totals.productNotFound++;
            if (totals.details.length < 10) totals.details.push({ offerId: offer.id, result: products.length ? 'URL_NOT_MATCHED' : 'EMPTY_PRODUCT_RESPONSE', productCount: products.length, bodyKeys: Object.keys(productBody || {}).slice(0, 8), firstUrl: products[0]?.url ? String(products[0].url).slice(0, 180) : null, expectedUrl: expectedUrl.slice(0, 180), firstProductKeys: products[0] ? Object.keys(products[0]).slice(0, 12) : [] });
            continue;
          }
          const price = lomadeeProductPrices(match);
          if (!price.available || !Number.isSafeInteger(price.currentPrice) || !Number.isSafeInteger(price.originalPrice) || price.currentPrice <= 0 || price.originalPrice <= 0) {
            await db.query("UPDATE offers SET validation_status='NEEDS_REVIEW',updated_at=now() WHERE id=$1 AND account_id=$2", [offer.id, accountId]);
            totals.offersNeedsReview = (totals.offersNeedsReview || 0) + 1;
            continue;
          }
          const hasDiscount = price.originalPrice > price.currentPrice;
          const priceChanged = price.currentPrice !== Number(offer.currentPrice) || price.originalPrice !== Number(offer.originalPrice);
          if (priceChanged) {
            totals.priceMismatch++;
            if (hasDiscount) {
              const discount = Math.round((price.originalPrice - price.currentPrice) * 100 / price.originalPrice);
              const score = offerScore({ title: offer.title, currentPrice: price.currentPrice, originalPrice: price.originalPrice });
              const message = promoMessage({ title: offer.title, source: 'LOMADEE', currentPrice: price.currentPrice, originalPrice: price.originalPrice, affiliateUrl: offer.affiliateUrl, imageUrl: offer.imageUrl, productUrl: offer.productUrl, couponUrl: offer.couponUrl, couponCode: offer.couponCode });
              await db.query("UPDATE offers SET current_price=$1,original_price=$2,discount_percent=$3,score=$4,message=$5,validation_status='VALIDATED',updated_at=now() WHERE id=$6 AND account_id=$7 AND status IN ('APPROVED','PUBLISHED')", [price.currentPrice, price.originalPrice, discount, score, message, offer.id, accountId]);
            } else {
              const message = promoMessage({ title: offer.title, source: 'LOMADEE', currentPrice: price.currentPrice, originalPrice: price.originalPrice, affiliateUrl: offer.affiliateUrl, imageUrl: offer.imageUrl, productUrl: offer.productUrl, couponUrl: offer.couponUrl, couponCode: offer.couponCode });
              await db.query("UPDATE offers SET current_price=$1,original_price=$2,discount_percent=0,message=$3,validation_status='VALIDATED',updated_at=now() WHERE id=$4 AND account_id=$5 AND status IN ('APPROVED','PUBLISHED','READY')", [price.currentPrice, price.originalPrice, message, offer.id, accountId]);
            }
          }
          const history = await db.query(
            "INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,$5,'OFFICIAL_API',$6,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours') RETURNING id",
            [crypto.randomUUID(), accountId, offer.id, price.currentPrice, price.originalPrice, 'LOMADEE:' + clean(price.id, 120)]
          );
          if (history.rows.length) {
            totals.pricesVerified++;
            if (totals.details.length < 10) totals.details.push({ offerId: offer.id, result: hasDiscount ? (priceChanged ? 'PRICE_REFRESHED_AND_VERIFIED' : 'PRICE_VERIFIED') : 'NO_DISCOUNT_NEEDS_REVIEW', currentPrice: price.currentPrice, originalPrice: price.originalPrice });
          } else totals.skippedRecent++;
        } catch (error) {
          totals.failed++;
          console.error('lomadee reconcile offer failed', String(error?.status || error?.name || 'ERROR').slice(0, 60));
        }
      }
    } catch (error) {
      totals.failed++;
      totals.ok = false;
      console.error('lomadee reconcile account failed', String(error?.status || error?.name || 'ERROR').slice(0, 60));
    }
  }
  return res.json(totals);
}