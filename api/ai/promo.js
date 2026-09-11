import { ai } from 'hatchable';
import { categoryHint } from 'lib/automation.js';

export const access = 'member';
export const methods = ['POST'];

export default async function(req, res) {
  // A borda exige uma conta autenticada antes de qualquer chamada de IA.
  if (!req.member) return res.status(401).json({ error: 'Não autorizado.' });
  const b = req.body || {};
  const title = String(b.title || '').trim().slice(0, 220);
  const rawPrice = String(b.price || '').trim().slice(0, 40);
  const rawOriginalPrice = String(b.originalPrice || '').trim().slice(0, 40);
  const store = String(b.store || '').trim().slice(0, 50);
  const link = String(b.link || '').trim().slice(0, 1200);
  const coupon = String(b.coupon || '').trim().slice(0, 80);
  const style = String(b.style || 'urgency').toLowerCase();

  const amount = Number(rawPrice.replace(/[^0-9,.-]/g, '').replace(',', '.'));
  const origAmount = Number(rawOriginalPrice.replace(/[^0-9,.-]/g, '').replace(',', '.'));

  if (!title || !Number.isFinite(amount) || amount <= 0 || !link) {
    return res.status(400).json({ error: 'Informe produto, preço e link.' });
  }

  try {
    if (new URL(link).protocol !== 'https:') throw new Error();
  } catch {
    return res.status(400).json({ error: 'Use um link HTTPS válido.' });
  }

  const priceStr = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const origStr = Number.isFinite(origAmount) && origAmount > amount
    ? origAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  const discountPercent = origStr ? Math.round(((origAmount - amount) / origAmount) * 100) : null;

  const compose = (cta) => {
    const lines = [
      discountPercent && discountPercent >= 15 ? `🔥 OFERTA IMPERDÍVEL (${discountPercent}% OFF)!` : '🔥 OFERTA ENCONTRADA!',
      '',
      `🛍️ ${title}`,
      origStr ? `💰 De ${origStr} por apenas ${priceStr}` : `💰 Por apenas ${priceStr}`,
      coupon ? `🎟️ Cupom: ${coupon}` : null,
      '',
      cta ? `⚡ ${cta}` : null,
      '',
      `🛒 Garanta aqui: ${link}`,
      '⚠️ Preço e estoque sujeitos a alteração a qualquer momento.'
    ].filter(line => line !== null);
    return lines.join('\n');
  };

  const stylePrompts = {
    urgency: 'Crie uma chamada para ação curta em português focada em urgência e escassez (ex: "Corre antes que esgote o estoque"). Máximo 10 palavras.',
    discount: 'Crie uma chamada para ação curta em português focada em custo-benefício e economia real. Máximo 10 palavras.',
    clean: 'Crie uma chamada para ação curta, direta e elegante em português. Máximo 10 palavras.'
  };

  const systemInstruction = (stylePrompts[style] || stylePrompts.urgency) +
    ' Não mencione valores em R$, porcentagens, cupons, frete ou links.';

  try {
    const result = await ai.generateText({
      purpose: 'affiliate-promo-copy',
      model: result.model || 'gemini-3.8-flash',
      maxTokens: 100,
      system: systemInstruction,
      prompt: `Loja: ${store}\nProduto: ${title}\nPreço: ${priceStr}${discountPercent ? `\nDesconto: ${discountPercent}%` : ''}`
    });

    if (result.finishReason === 'length') {
      return res.status(502).json({ error: 'A mensagem ficou longa demais. Tente novamente.' });
    }

    const cta = String(result.text || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
    const safe = cta && !/R\$|https?:|frete|cupom|%/i.test(cta)
      ? cta
      : 'Aproveite enquanto a oferta estiver disponível!';

    return res.json({
      message: compose(safe),
      category: categoryHint(title),
      aiUsed: true,
      model: 'gemini-3.8-flash',
      validated: true
    });
  } catch (e) {
    const defaultCta = style === 'clean'
      ? 'Excelente oportunidade para garantir o seu hoje.'
      : 'Aproveite enquanto a oferta estiver disponível!';
    const fallback = compose(defaultCta);
    return res.json({
      message: fallback,
      category: categoryHint(title),
      aiUsed: false,
      model: 'fallback-local',
      notice: 'Mensagem gerada com motor de copy local. Para ativar o Gemini 3.8 Flash, adicione a chave GEMINI_API_KEY no painel de configurações.'
    });
  }
}
