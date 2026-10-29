export const access = 'admin';

export default {
  name: 'categorize_product',
  description: 'Classifica um produto em uma lista fechada de categorias. Usa o provedor de IA configurado no Hatchable; não inventa atributos do produto.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 220 },
      description: { type: 'string', maxLength: 1800 },
      categories: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 80 },
    },
    required: ['title', 'categories'],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const title = String(args.title || '').trim().slice(0, 220);
    const description = String(args.description || '').trim().slice(0, 1800);
    const categories = Array.isArray(args.categories)
      ? args.categories.map((value) => String(value || '').trim().slice(0, 80)).filter(Boolean).slice(0, 80)
      : [];
    if (!title || !categories.length) throw new Error('Informe o título e ao menos uma categoria permitida.');
    const result = await ctx.ai.generateText({
      purpose: 'mcp-categorize-product',
      model: 'gemini',
      maxTokens: 300,
      system: 'Você classifica produtos de marketplace. Escolha EXATAMENTE uma categoria da lista fornecida. Não crie categorias e não infira fatos não presentes. Retorne JSON válido com category e reason. Se houver incerteza, diga isso em reason.',
      prompt: JSON.stringify({ title, description, allowedCategories: categories }),
    });
    if (result.finishReason === 'length') throw new Error('Resposta incompleta; tente com uma descrição menor.');
    let parsed;
    try { parsed = JSON.parse(result.text); } catch { throw new Error('A IA não retornou JSON válido. Tente novamente.'); }
    const category = String(parsed.category || '').trim();
    if (!categories.includes(category)) throw new Error('A IA retornou uma categoria fora da lista permitida.');
    return { category, reason: String(parsed.reason || '').slice(0, 500), model: result.model || 'platform-default' };
  },
};