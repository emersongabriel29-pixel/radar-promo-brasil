const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
const finitePositive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const hasValue = (value) => value !== null && value !== undefined && value !== '';

/**
 * Scores an offer from 0–100 using only evidence actually supplied by its source.
 * Existing callers remain compatible; optional commerce signals add value when present.
 * Set originalPriceVerified=false when the crossed-out/original price is not independently
 * trustworthy. Never infer a real discount from a fabricated original price.
 */
export function calculateRadarScore({
  currentPrice,
  originalPrice = null,
  originalPriceVerified = null,
  lowestPrice = null,
  averagePrice = null,
  historyCount = 0,
  title = '',
  coupon = false,
  categoryMatch = true,
  commissionRate = null,
  commissionValue = null,
  salesCount = null,
  rating = null,
  reviewCount = null,
  imageUrl = null,
  productUrl = null,
}) {
  const current = Number(currentPrice || 0);
  const original = Number(originalPrice || 0);
  const low = Number(lowestPrice || 0);
  const avg = Number(averagePrice || 0);
  const history = Math.max(0, Number(historyCount) || 0);
  const reasons = [];
  let score = 35;

  if (low > 0 && current > 0 && current <= low) {
    score += 25;
    reasons.push('no menor preço registrado');
  } else if (avg > 0 && current > 0 && current < avg) {
    const belowAverage = ((avg - current) / avg) * 100;
    score += Math.min(18, belowAverage * 0.9);
    if (belowAverage >= 10) reasons.push(`${Math.round(belowAverage)}% abaixo da média histórica`);
  }

  const discountCanBeTrusted = originalPriceVerified !== false;
  if (discountCanBeTrusted && original > current && current > 0) {
    const discount = ((original - current) / original) * 100;
    score += Math.min(25, discount * 0.8);
    if (discount >= 20) reasons.push(`desconto de ${Math.round(discount)}% sobre o preço informado`);
  } else if (original > current && originalPriceVerified === false) {
    reasons.push('desconto anunciado não pontuado: preço original não verificado');
  }

  if (history >= 7) score += 8;
  else if (history >= 3) score += 4;
  if (history >= 3) reasons.push(`${history} registros de preço disponíveis`);
  else reasons.push('sem histórico suficiente — score provisório');

  if (coupon) { score += 4; reasons.push('cupom disponível'); }
  if (categoryMatch) score += 3;
  if (/iphone|samsung|notebook|tv|air ?fryer|fralda|perfume|playstation|xbox/i.test(title)) score += 3;

  if (hasValue(commissionRate) && Number(commissionRate) > 0) {
    score += Math.min(8, Number(commissionRate) * 0.8);
    reasons.push(`comissão informada de ${Number(commissionRate)}%`);
  } else if (finitePositive(commissionValue)) {
    score += Math.min(8, Number(commissionValue) / 5);
    reasons.push('comissão estimada disponível');
  }

  if (hasValue(salesCount) && Number(salesCount) >= 0) {
    const sales = Number(salesCount);
    score += sales >= 1000 ? 8 : sales >= 100 ? 6 : sales >= 20 ? 3 : 0;
    if (sales >= 20) reasons.push(`popularidade: ${sales} vendas informadas`);
  }
  if (hasValue(rating) && Number(rating) >= 0 && Number(rating) <= 5) {
    if (Number(rating) >= 4.7) score += 5;
    else if (Number(rating) >= 4.4) score += 3;
    else if (Number(rating) < 3.5) score -= 8;
    if (Number(rating) > 0) reasons.push(`avaliação informada de ${Number(rating).toFixed(1)}/5`);
  }
  if (hasValue(reviewCount) && Number(reviewCount) >= 50) score += 2;

  const qualitySignals = [];
  if (typeof title === 'string' && title.trim().length >= 8) qualitySignals.push('título');
  if (typeof productUrl === 'string' && /^https?:\/\//i.test(productUrl)) qualitySignals.push('link');
  if (typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl)) qualitySignals.push('imagem');
  score += qualitySignals.length * 2;
  if (qualitySignals.length) reasons.push(`dados de qualidade: ${qualitySignals.join(', ')}`);
  else reasons.push('link e imagem não confirmados');

  return { score: clamp(score, 0, 100), reasons };
}

export function classifyRadarScore(score) {
  if (score >= 90) return { label: 'EXCEPCIONAL', action: 'PUBLICAR_AGORA' };
  if (score >= 80) return { label: 'ÓTIMA', action: 'RECOMENDADA' };
  if (score >= 70) return { label: 'BOA', action: 'AVALIAR' };
  if (score >= 55) return { label: 'REGULAR', action: 'AGUARDAR' };
  return { label: 'FRACA', action: 'IGNORAR' };
}

/** Score every candidate before selecting a batch; stable ties preserve source order. */
export function rankRadarOffers(offers, { limit = Infinity, minimumScore = 0 } = {}) {
  if (!Array.isArray(offers)) return [];
  const ranked = offers.map((offer, index) => {
    const result = calculateRadarScore(offer || {});
    return {
      ...(offer || {}),
      radarScore: result.score,
      radarScoreReasons: result.reasons,
      radarClassification: classifyRadarScore(result.score),
      _sourceIndex: index,
    };
  });
  ranked.sort((a, b) => b.radarScore - a.radarScore || a._sourceIndex - b._sourceIndex);
  const filtered = ranked.filter((offer) => offer.radarScore >= minimumScore);
  const selected = Number.isFinite(limit) ? filtered.slice(0, Math.max(0, Math.floor(limit))) : filtered;
  return selected.map(({ _sourceIndex, ...offer }) => offer);
}
