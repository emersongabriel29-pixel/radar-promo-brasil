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
  const store = String(b.store || '').trim().slice(0, 50);
  const link = String(b.link || '').trim().slice(0, 1200);
  const amount=Number(rawPrice.replace(/[^0-9,.-]/g,'').replace(',','.'));
  if (!title || !Number.isFinite(amount) || amount<=0 || !link) return res.status(400).json({ error: 'Informe produto, preço e link.' });
  try{if(new URL(link).protocol!=='https:')throw new Error()}catch{return res.status(400).json({error:'Use um link HTTPS válido.'})}
  const price=amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const compose=cta=>['🔥 OFERTA ENCONTRADA!','🛍️ '+title,'💰 '+price,cta,'🛒 Confira: '+link,'⚠️ Preço e estoque podem mudar.'].join('\n');
  try {
    const result = await ai.generateText({
      purpose: 'affiliate-promo-copy',
      model: 'gpt-mini',
      maxTokens: 80,
      system: 'Crie somente uma chamada para ação em português, com no máximo 10 palavras. Não mencione preço, desconto, frete, estoque, cupom, garantia ou links.',
      prompt: 'Loja: '+store+'\nProduto: '+title
    });
    if (result.finishReason === 'length') return res.status(502).json({ error: 'A mensagem ficou longa demais. Tente novamente.' });
    const cta=String(result.text||'').replace(/[\r\n]+/g,' ').trim().slice(0,120);
    const safe=cta&&!/R\$|https?:|frete|estoque|cupom|garantia|%/i.test(cta)?cta:'Aproveite enquanto a oferta estiver disponível.';
    return res.json({ message:compose(safe),category:categoryHint(title),usage:result.usage,validated:true });
  } catch (e) {
    const fallback=compose('Aproveite enquanto a oferta estiver disponível.');
    return res.json({message:fallback,category:categoryHint(title),aiUsed:false,notice:'Mensagem criada pelo modo automático. Configure a IA para textos personalizados.'});
  }
}
