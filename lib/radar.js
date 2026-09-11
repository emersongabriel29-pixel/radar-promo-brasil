const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(n) || 0)));

export function calculateRadarScore({ currentPrice, originalPrice = null, lowestPrice = null, averagePrice = null, historyCount = 0, title = '', coupon = false, categoryMatch = true }) {
  const current = Number(currentPrice || 0);
  const original = Number(originalPrice || 0);
  const low = Number(lowestPrice || 0);
  const avg = Number(averagePrice || 0);
  const reasons = [];
  let score = 35;

  if (original > current && current > 0) {
    const discount = ((original - current) / original) * 100;
    score += Math.min(25, discount * 0.8);
    if (discount >= 20) reasons.push(`desconto de ${Math.round(discount)}% sobre o preço informado`);
  }

  if (low > 0 && current <= low) {
    score += 25;
    reasons.push('no menor preço registrado');
  } else if (avg > 0 && current < avg) {
    const belowAverage = ((avg - current) / avg) * 100;
    score += Math.min(18, belowAverage * 0.9);
    if (belowAverage >= 10) reasons.push(`${Math.round(belowAverage)}% abaixo da média histórica`);
  }

  if (historyCount >= 7) score += 8;
  else if (historyCount >= 3) score += 4;
  if (historyCount >= 3) reasons.push(`${historyCount} registros de preço disponíveis`);

  if (coupon) { score += 4; reasons.push('cupom disponível'); }
  if (categoryMatch) score += 3;
  if (/iphone|samsung|notebook|tv|air ?fryer|fralda|perfume|playstation|xbox/i.test(title)) score += 3;

  if (!historyCount) reasons.push('sem histórico suficiente — score provisório');
  return { score: clamp(score, 35, 100), reasons };
}

export function classifyRadarScore(score) {
  if (score >= 90) return { label: 'EXCEPCIONAL', action: 'PUBLICAR_AGORA' };
  if (score >= 80) return { label: 'ÓTIMA', action: 'RECOMENDADA' };
  if (score >= 70) return { label: 'BOA', action: 'AVALIAR' };
  if (score >= 55) return { label: 'REGULAR', action: 'AGUARDAR' };
  return { label: 'FRACA', action: 'IGNORAR' };
}