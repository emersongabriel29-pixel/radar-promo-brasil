import { ai, db } from 'hatchable';
import { categoryHint } from 'lib/automation.js';
import { formatPromo } from 'lib/promo-message.js';

export const access = 'member';
export const methods = ['POST'];

export default async function(req, res) {
  // A borda exige uma conta autenticada antes de qualquer chamada de IA.
  if (!req.member) return res.status(401).json({ error: 'Não autorizado.' });
  const b = req.body || {};
  const title = String(b.title || '').trim().slice(0, 220);
  const rawPrice = String(b.price || '').trim().slice(0, 40);
  const store = String(b.store || '').trim().slice(0, 50);
  const style = ['persuasive','urgency','discount'].includes(String(b.style || '').toLowerCase()) ? String(b.style).toLowerCase() : 'persuasive';
  const link = String(b.link || '').trim().slice(0, 1200);
  const amount=Number(rawPrice.replace(/[^0-9,.-]/g,'').replace(',','.'));
  if (!title || !Number.isFinite(amount) || amount<=0 || !link) return res.status(400).json({ error: 'Informe produto, preço e link.' });
  try{if(new URL(link).protocol!=='https:')throw new Error()}catch{return res.status(400).json({error:'Use um link HTTPS válido.'})}
  const originalAmount=Number(String(b.originalPrice||'').replace(/[^0-9,.-]/g,'').replace(',','.'))||0,category=categoryHint(title,store);
  const base=()=>formatPromo({title,source:store,category,currentPrice:Math.round(amount*100),originalPrice:Math.round(originalAmount*100),affiliateUrl:link,couponCode:b.couponCode,couponUrl:b.couponUrl,template:b.template});
  const compose=cta=>{const formatted=base();return {...formatted,message:formatted.message.replace('\n\n💗','\n'+cta+'\n\n💗')}};
  try {
    const result = await ai.generateText({
      purpose: 'affiliate-promo-copy',
      model: 'gemini-flash',
      maxTokens: 80,
      system: 'Crie somente uma chamada para ação em português, com no máximo 10 palavras. Não mencione preço, desconto, frete, estoque, cupom, garantia ou links.',
      prompt: 'Loja: '+store+'\nProduto: '+title+'\nEstilo: '+style
    });
    if (result.finishReason === 'length') {
      const fallback=compose('Aproveite enquanto a oferta estiver disponível.');
      return res.json({message:fallback.message,template:fallback.template,discountPercent:fallback.discountPercent,category,aiUsed:false,validated:true,notice:'A IA excedeu o limite; o modelo automático seguro concluiu a mensagem.'});
    }
    const cta=String(result.text||'').replace(/[\r\n]+/g,' ').trim().slice(0,120);
    const safe=cta&&!/R\$|https?:|frete|estoque|cupom|garantia|%/i.test(cta)?cta:'Aproveite enquanto a oferta estiver disponível.';
    const ready=compose(safe);
    await db.query("UPDATE integration_health SET status='READY', details=$1, last_checked_at=now(), updated_at=now() WHERE name='ai'",['Texto promocional validado com IA e regras determinísticas']);
    return res.json({message:ready.message,template:ready.template,discountPercent:ready.discountPercent,category,usage:result.usage,validated:true,model:'gemini-3-flash-preview'});
  } catch (e) {
    const fallback=compose('Aproveite enquanto a oferta estiver disponível.');
    return res.json({message:fallback.message,template:fallback.template,discountPercent:fallback.discountPercent,category,aiUsed:false,validated:true,notice:'Mensagem criada pelo modo automático com todos os dados confirmados.'});
  }
}
