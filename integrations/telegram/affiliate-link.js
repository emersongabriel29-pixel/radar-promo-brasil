/**
 * Isola a preparação de links/mensagem do Telegram para evitar alterações
 * acidentais no roteamento, na fila ou nos demais provedores.
 *
 * A URL original cadastrada na oferta é preservada. Redirecionamentos internos
 * só podem ser introduzidos por uma mudança explícita, documentada e testada.
 */
export function prepareTelegramOfferLinks(item = {}) {
  const affiliateUrl = String(item.affiliateUrl || '').trim();
  const baseMessage = String(item.message || '');
  const couponUrl = String(item.couponUrl || '').trim();

  const message = item.couponCode && couponUrl && !baseMessage.includes(couponUrl)
    ? baseMessage + String.fromCharCode(10, 10) + '🎟️ Resgate o cupom aqui: ' + couponUrl
    : baseMessage;

  return { affiliateUrl, message };
}
