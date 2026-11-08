const https = value => { try { const url = new URL(String(value || '').trim()); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };

/**
 * Commercial attributes are descriptive, never eligibility gates.
 * Only the factual fields needed to create a truthful, attributable promotion are required.
 */
export function canEnterOfferFlow(offer = {}) {
  const title = String(offer.title || '').trim();
  const price = Number(offer.current_price ?? offer.currentPrice);
  const affiliateUrl = offer.affiliate_url ?? offer.affiliateUrl;
  if (String(offer.status || '').toUpperCase() === 'PROVIDER_RESTRICTED') return { eligible: false, reason: 'EXTERNAL_PROVIDER_POLICY_RESTRICTION' };
  if (String(offer.status || '').toUpperCase() === 'DUPLICATE_MERGED') return { eligible: false, reason: 'MERGED_INTO_CANONICAL_OFFER' };
  if (String(offer.validation_status || '').toUpperCase() === 'REJECTED') return { eligible: false, reason: 'DUPLICATE_OR_DATA_INTEGRITY_RECONCILIATION_REQUIRED' };
  if (!title) return { eligible: false, reason: 'MISSING_TITLE' };
  if (!Number.isSafeInteger(price) || price <= 0) return { eligible: false, reason: 'MISSING_VERIFIABLE_PRICE' };
  if (!https(affiliateUrl)) return { eligible: false, reason: 'MISSING_VALID_AFFILIATE_LINK' };
  return { eligible: true, reason: null };
}