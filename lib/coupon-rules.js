const clean = (value, max = 100) => String(value ?? '').trim().slice(0, max);

export function couponSavingsCents(coupon, priceCents) {
  const price = Math.round(Number(priceCents));
  if (!coupon || !Number.isSafeInteger(price) || price <= 0 || coupon.status !== 'ACTIVE') return 0;
  const minimum = Math.max(0, Number(coupon.minPurchaseCents ?? coupon.min_purchase_cents) || 0);
  if (price < minimum) return 0;

  const type = clean(coupon.discountType ?? coupon.discount_type, 12).toUpperCase();
  const value = Math.max(0, Number(coupon.discountValue ?? coupon.discount_value) || 0);
  let savings = 0;
  if (type === 'PERCENT' && value > 0 && value <= 100) savings = Math.floor(price * value / 100);
  else if (type === 'FIXED' && value > 0) savings = value;
  else return 0;

  const cap = Math.max(0, Number(coupon.maxDiscountCents ?? coupon.max_discount_cents) || 0);
  if (cap > 0) savings = Math.min(savings, cap);
  return Math.max(0, Math.min(price, Math.floor(savings)));
}

export function bestApplicableCoupon(coupons, { marketplace, priceCents, now = new Date() } = {}) {
  const store = clean(marketplace, 40).toUpperCase();
  const timestamp = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!store || !Number.isFinite(timestamp)) return null;

  return (Array.isArray(coupons) ? coupons : [])
    .map(coupon => {
      const starts = coupon.startsAt ?? coupon.starts_at;
      const ends = coupon.endsAt ?? coupon.ends_at;
      if (clean(coupon.marketplace, 40).toUpperCase() !== store) return null;
      if (starts && Date.parse(starts) > timestamp) return null;
      if (ends && Date.parse(ends) <= timestamp) return null;
      const savingsCents = couponSavingsCents(coupon, priceCents);
      return savingsCents > 0 ? { ...coupon, savingsCents } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.savingsCents !== a.savingsCents) return b.savingsCents - a.savingsCents;
      const aEnd = Date.parse(a.endsAt ?? a.ends_at ?? '') || Number.MAX_SAFE_INTEGER;
      const bEnd = Date.parse(b.endsAt ?? b.ends_at ?? '') || Number.MAX_SAFE_INTEGER;
      return aEnd - bEnd;
    })[0] || null;
}

export async function findBestApplicableCoupon(db, accountId, marketplace, priceCents) {
  const store = clean(marketplace, 40).toUpperCase();
  if (!store || !Number.isSafeInteger(Math.round(Number(priceCents))) || Number(priceCents) <= 0) return null;
  const result = await db.query(
    'SELECT id,marketplace,code,title,url,discount_text AS "discountText",discount_type AS "discountType",discount_value AS "discountValue",max_discount_cents AS "maxDiscountCents",min_purchase_cents AS "minPurchaseCents",starts_at AS "startsAt",ends_at AS "endsAt",status FROM coupons WHERE account_id=$1 AND marketplace=$2 AND status=\'ACTIVE\' AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now())',
    [accountId, store],
  );
  return bestApplicableCoupon(result.rows, { marketplace: store, priceCents });
}