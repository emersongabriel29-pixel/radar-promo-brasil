export const access = 'admin';

export default {
  name: 'validate_offer_facts',
  description: 'Valida a estrutura de dados de uma oferta antes de criar conteúdo. Não consulta lojas, não confirma disponibilidade real e não publica nada.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 220 },
      currentPrice: { type: 'number', exclusiveMinimum: 0 },
      affiliateUrl: { type: 'string', maxLength: 1200 },
      originalPrice: { type: 'number', exclusiveMinimum: 0 },
      coupon: { type: 'string', maxLength: 100 },
      stockConfirmedAt: { type: 'string', maxLength: 60 },
      shippingConfirmedAt: { type: 'string', maxLength: 60 },
    },
    required: ['title', 'currentPrice', 'affiliateUrl'],
    additionalProperties: false,
  },
  async handler(args) {
    const title = String(args.title || '').trim();
    const currentPrice = Number(args.currentPrice);
    const originalPrice = args.originalPrice == null ? null : Number(args.originalPrice);
    let url;
    try { url = new URL(String(args.affiliateUrl || '')); } catch { throw new Error('Link de afiliado inválido.'); }
    if (url.protocol !== 'https:') throw new Error('O link deve usar HTTPS.');
    const issues = [];
    if (!title) issues.push('Título vazio.');
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) issues.push('Preço atual inválido.');
    if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice <= 0)) issues.push('Preço anterior inválido.');
    if (originalPrice !== null && originalPrice < currentPrice) issues.push('Preço anterior menor que o preço atual; não calcule desconto.');
    return {
      structurallyValid: issues.length === 0,
      issues,
      verifiedByThisTool: false,
      warning: 'A validação é estrutural; preço, estoque, frete, cupom e validade ainda precisam ser conferidos na fonte oficial.',
      normalizedFacts: {
        title,
        currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
        originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
        affiliateUrl: url.toString(),
        coupon: args.coupon ? String(args.coupon).slice(0, 100) : null,
        stockConfirmedAt: args.stockConfirmedAt ? String(args.stockConfirmedAt).slice(0, 60) : null,
        shippingConfirmedAt: args.shippingConfirmedAt ? String(args.shippingConfirmedAt).slice(0, 60) : null,
      },
    };
  },
};
