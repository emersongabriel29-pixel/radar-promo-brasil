import { ai } from 'hatchable';
import { categoryHint } from 'lib/automation.js';

export const access = 'admin';
export const methods = ['POST'];

export default async function(req, res) {
  // Defesa adicional: o Hatchable já exige `access = 'admin'` na borda.
  // Sem a identidade administrativa fornecida pela plataforma, nenhuma chamada de IA é executada.
  if (!req.member) return res.status(401).json({ error: 'Não autorizado.' });
  const b = req.body || {};
  const title = String(b.title || '').trim().slice(0, 220);
  const price = String(b.price || '').trim().slice(0, 40);
  const store = String(b.store || '').trim().slice(0, 50);
  const link = String(b.link || '').trim().slice(0, 1200);
  if (!title || !price || !link) return res.status(400).json({ error: 'Informe produto, preço e link.' });
  try {
    const result = await ai.generateText({
      purpose: 'affiliate-promo-copy',
      model: 'gpt-mini',
      maxTokens: 500,
      system: 'Você cria anúncios curtos de ofertas para WhatsApp no Brasil. Responda somente com a mensagem final em português. Não invente desconto, frete, estoque ou cupom. Use no máximo 6 linhas, poucos emojis e uma chamada para ação clara. Preserve o link exatamente.',
      prompt: 'Loja: ' + store + '\nProduto: ' + title + '\nPreço: ' + price + '\nLink: ' + link
    });
    if (result.finishReason === 'length') return res.status(502).json({ error: 'A mensagem ficou longa demais. Tente novamente.' });
    return res.json({ message: result.text, category: categoryHint(title), usage: result.usage });
  } catch (e) {
    const fallback=['🔥 OFERTA ENCONTRADA!','', '🛍️ '+title,'💰 Por '+price,'','🛒 Confira: '+link,'⚠️ Preço e estoque podem mudar.'].join('\n');
    return res.json({message:fallback,category:categoryHint(title),aiUsed:false,notice:'Mensagem criada pelo modo automático. Configure a IA para textos personalizados.'});
  }
}
