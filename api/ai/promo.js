import { ai,db } from 'hatchable';
import { categoryHint } from 'lib/automation.js';

export const access = 'member';
export const methods = ['POST'];

export default async function(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Não autorizado.' });
  const b = req.body || {};
  const title = String(b.title || '').trim().slice(0, 220);
  const rawPrice = String(b.price || '').trim().slice(0, 40);
  const store = String(b.store || '').trim().slice(0, 50);
  const link = String(b.link || '').trim().slice(0, 1200);
  const style = String(b.style || 'persuasive').trim();
  const amount = Number(rawPrice.replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (!title || !Number.isFinite(amount) || amount <= 0 || !link) {
    return res.status(400).json({ error: 'Informe produto, preço e link.' });
  }
  try {
    if (new URL(link).protocol !== 'https:') throw new Error();
  } catch {
    return res.status(400).json({ error: 'Use um link HTTPS válido.' });
  }
  const price = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const compose = cta => [
    '🔥 OFERTA ENCONTRADA!',
    '🛍️ ' + title,
    '💰 ' + price,
    cta,
    '🛒 Confira: ' + link,
    '⚠️ Preço e estoque podem mudar.'
  ].join('\n');

  try {
    const promptStyle = style === 'urgency'
      ? 'Crie uma chamada urgente de escassez e rapidez para a oferta.'
      : (style === 'discount' ? 'Destaque o valor e a economia imperdível dessa promoção.' : 'Crie uma chamada para ação persuasiva em português.');

    const result = await ai.generateText({
      purpose: 'affiliate-promo-copy',
      model: 'gemini-flash',
      maxTokens: 1000,
      system: 'Você é o copywriter do Radar Promo Brasil. Crie somente a chamada de impacto em português (uma frase objetiva, até 15 palavras). Não invente cupons, frete grátis, garantia ou links.',
      prompt: promptStyle + '\nLoja: ' + store + '\nProduto: ' + title + '\nPreço: ' + price
    });

    const cta = String(result.text || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
    const safe = cta && !/https?:/i.test(cta) ? cta : 'Aproveite enquanto a oferta estiver disponível.';
    await db.query("INSERT INTO integration_health(name,status,details,last_checked_at) VALUES('ai','ACTIVE','Gemini respondeu com sucesso',now()) ON CONFLICT(name) DO UPDATE SET status='ACTIVE',details='Gemini respondeu com sucesso',last_checked_at=now()");
    return res.json({
      message: compose(safe),
      category: categoryHint(title),
      model: 'gemini-3-flash-preview',
      usage: result.usage,
      validated: true
    });
  } catch (e) {
    const fallback = compose('Aproveite enquanto a oferta estiver disponível.');
    return res.json({
      message: fallback,
      category: categoryHint(title),
      aiUsed: false,
      notice: 'Mensagem criada pelo modo automático com fallback inteligente.'
    });
  }
}