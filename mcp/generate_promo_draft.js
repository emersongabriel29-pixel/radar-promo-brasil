export const access = 'admin';

export default {
  name: 'generate_promo_draft',
  description: 'Gera um RASCUNHO de texto promocional a partir de fatos fornecidos e verificados. Não publica, não envia mensagens e não inventa preços, descontos, estoque, frete ou cupons.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 220 },
      channel: { type: 'string', enum: ['whatsapp', 'telegram', 'instagram', 'general'] },
      verifiedFacts: { type: 'object', description: 'Fatos conferidos, como preço atual, preço anterior, cupom, validade e link oficial.' },
      tone: { type: 'string', maxLength: 80 },
    },
    required: ['title', 'channel', 'verifiedFacts'],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const title = String(args.title || '').trim().slice(0, 220);
    const channel = String(args.channel || 'general');
    const facts = args.verifiedFacts;
    if (!title) throw new Error('Informe o produto.');
    if (!['whatsapp', 'telegram', 'instagram', 'general'].includes(channel)) throw new Error('Canal inválido.');
    if (!facts || typeof facts !== 'object' || Array.isArray(facts)) throw new Error('Informe os fatos verificados como objeto.');
    const factsJson = JSON.stringify(facts);
    if (factsJson.length > 5000) throw new Error('Os fatos fornecidos excedem 5.000 caracteres.');
    const result = await ctx.ai.generateText({
      purpose: 'mcp-promo-draft',
      model: 'gemini',
      maxTokens: 700,
      system: 'Escreva em português brasileiro um rascunho promocional para afiliados. Use somente os fatos fornecidos. Nunca invente nem estime preço, desconto, frete, estoque, cupom, prazo, comissão, avaliação ou urgência. Preserve links exatamente. Se um dado estiver ausente, omita-o. Inclua transparência de link afiliado quando houver link. Não afirme que publicou ou verificou externamente a oferta. Retorne apenas o texto do rascunho.',
      prompt: JSON.stringify({ product: title, channel, tone: String(args.tone || 'claro, confiável e objetivo').slice(0, 80), verifiedFacts: facts }),
    });
    if (result.finishReason === 'length') throw new Error('O texto foi truncado. Reduza os fatos e tente novamente.');
    const draft = String(result.text || '').trim().slice(0, 3500);
    if (!draft) throw new Error('A IA não retornou um rascunho.');
    return { draft, status: 'DRAFT_ONLY', published: false, model: result.model || 'platform-default', usage: result.usage || null };
  },
};