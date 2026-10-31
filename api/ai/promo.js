import { ai, db } from 'hatchable';
import { categoryHint } from 'lib/automation.js';
import { formatPromo } from 'lib/promo-message.js';
import { moneyCents,httpsUrl } from 'lib/validation.js';
import { safeCreative } from 'lib/creative.js';
import { checkGeminiCooldown, registerGeminiQuotaError } from 'lib/radar-ai-guard.js';

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
  const amount=moneyCents(rawPrice)/100;
  if (!title || !Number.isFinite(amount) || amount<=0 || !link) return res.status(400).json({ error: 'Informe produto, preço e link.' });
  if(!httpsUrl(link)||b.couponUrl&&!httpsUrl(b.couponUrl))return res.status(400).json({error:'Use links HTTPS válidos.'});
  const originalAmount=Number(String(b.originalPrice||'').replace(/[^0-9,.-]/g,'').replace(',','.'))||0,category=categoryHint(title,store);
  const base=(shortTitle=title)=>formatPromo({title,shortTitle,source:store,category,currentPrice:Math.round(amount*100),originalPrice:Math.round(originalAmount*100),affiliateUrl:link,couponCode:b.couponCode,couponUrl:b.couponUrl,template:b.template});
  const compose=shortTitle=>base(shortTitle||title);
  const cooldown=await checkGeminiCooldown();
  if(cooldown){const fallback=compose(title);return res.json({message:fallback.message,shortTitle:fallback.shortTitle,template:fallback.template,discountPercent:fallback.discountPercent,category,aiUsed:false,validated:true,notice:'Gemini em pausa temporária; foi aplicado o texto automático seguro.'});}
  try {
    const aiInput = {
      purpose: 'affiliate-promo-copy',
      userId: String(req.member.id),
      model: 'gemini-flash',
      maxTokens: 256,
      system: 'Reescreva o nome comercial do produto em português brasileiro, com no máximo 6 palavras e até 70 caracteres. Preserve marca, modelo e identidade quando presentes. Não invente características, benefícios ou compatibilidade. Não use emojis, preço, desconto, urgência nem chamadas promocionais. Retorne somente o nome curto.',
      prompt: 'Loja: '+store+'\nNome original do produto: '+title+'\nProduza apenas uma versão comercial curta e fiel.'
    };
    let result = await ai.generateText(aiInput);
    // Uma única tentativa por solicitação; em falha ou truncamento usamos o texto seguro local.
    if (result.finishReason === 'length' || !String(result.text || '').trim()) {
      const fallback=compose(title);
      return res.json({message:fallback.message,shortTitle:fallback.shortTitle,template:fallback.template,discountPercent:fallback.discountPercent,category,aiUsed:false,validated:true,notice:'A IA não concluiu uma resposta íntegra; foi aplicado o texto automático seguro.'});
    }
    const aiTitle=String(result.text||'').replace(/[\r\n]+/g,' ').replace(/[<>*_`]/g,'').trim().slice(0,70);
    const safe=safeCreative(aiTitle)||title;
    const ready=compose(safe);
    await db.query("INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) SELECT id,'ai','TESTED','Texto promocional gerado e filtrado',now() FROM accounts WHERE owner_member_id=$1 ON CONFLICT(account_id,name) DO UPDATE SET status='TESTED',details=EXCLUDED.details,last_checked_at=now()",[String(req.member.id)]);
    return res.json({message:ready.message,shortTitle:ready.shortTitle,template:ready.template,discountPercent:ready.discountPercent,category,usage:result.usage,validated:true,model:result.model||'gemini'});
  } catch (e) {
    if(/429|quota|rate.?limit|resource_exhausted/i.test(String(e?.message||'')))await registerGeminiQuotaError();
    const fallback=compose(title);
    return res.json({message:fallback.message,shortTitle:fallback.shortTitle,template:fallback.template,discountPercent:fallback.discountPercent,category,aiUsed:false,validated:true,notice:'Mensagem criada pelo modo automático com todos os dados confirmados.'});
  }
}