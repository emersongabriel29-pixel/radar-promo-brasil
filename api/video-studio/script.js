import { db } from 'hatchable';
import { generateGeminiText } from 'lib/gemini.js';
import { isSetupRequired } from 'lib/media.js';
import { checkGeminiCooldown, registerGeminiQuotaError } from 'lib/radar-ai-guard.js';

export const access='member';
export const methods=['POST'];
const clean=(v,n=3000)=>String(v??'').trim().slice(0,n);

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para usar a criação de roteiro com IA.'});
  const account=(await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel do Radar uma vez para inicializar sua conta.'});
  const b=req.body||{},offerId=clean(b.offerId,100);
  const offer=(await db.query(`SELECT o.id,o.title,o.source,o.current_price AS "currentPrice",o.original_price AS "originalPrice",
    o.affiliate_url AS "affiliateUrl",o.image_url AS "imageUrl",
    EXISTS(SELECT 1 FROM offer_price_history ph WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
      AND ph.source_type='OFFICIAL_API' AND ph.verified_at IS NOT NULL AND ph.verified_at>now()-interval '24 hours'
      AND ph.price=o.current_price AND ph.original_price=o.original_price
      AND ph.verified_at=(SELECT MAX(ph2.verified_at) FROM offer_price_history ph2
        WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id AND ph2.source_type='OFFICIAL_API')) AS "priceVerified"
    FROM offers o WHERE o.id=$1 AND o.account_id=$2 AND o.status IN ('APPROVED','PUBLISHED') LIMIT 1`,[offerId,account.id])).rows[0];
  if(!offer)return res.status(404).json({error:'Selecione uma oferta aprovada da sua conta.'});
  const duration=[15,30,45,60].includes(Number(b.durationSeconds))?Number(b.durationSeconds):30;
  const template=['OFERTA','UGC','VITRINE','IMPORTADO'].includes(clean(b.template,20))?clean(b.template,20):'OFERTA';
  const facts={title:offer.title,marketplace:offer.source,priceVerified:Boolean(offer.priceVerified),
    currentPrice:offer.priceVerified?Number(offer.currentPrice):null,
    originalPrice:offer.priceVerified&&offer.originalPrice!=null?Number(offer.originalPrice):null};
  const prompt=[
    'Crie um roteiro de vídeo vertical de afiliado em português brasileiro, pronto para locução e edição.',
    'Duração total: '+duration+' segundos. Estilo: '+template+'.',
    'Produto e fatos: '+JSON.stringify(facts),
    'Orientação criativa: '+clean(b.instructions,1000),
    'Entregue cenas com timecode, texto na tela e fala do narrador. Comece com gancho natural, explique apenas fatos disponíveis e termine com CTA: "Confira o link na descrição e entre no nosso grupo de ofertas do Telegram para mais achadinhos."',
    'Regras obrigatórias: nunca invente atributos, benefícios, compatibilidade, avaliações, estoque, frete, garantia, urgência, desconto ou preço. Só mencione preço se priceVerified=true. Se não houver preço verificado, diga para consultar o valor atualizado na loja. Não afirme que testou o produto. Sem hashtags excessivas. Termine com legenda curta e aviso de variação de preço.'
  ].join('\n');
  try{
    let result,model='gemini';
    if(await checkGeminiCooldown())return res.status(429).json({error:'Gemini em pausa temporária para respeitar a cota gratuita.'});
    result=await generateGeminiText({purpose:'video-studio-script',model,userId:String(req.member.id),maxTokens:2200,system:'Você é roteirista de performance para vídeos curtos de comércio eletrônico. Escreva de forma natural, clara, persuasiva e honesta. Nunca invente fatos.',prompt,signal:AbortSignal.timeout(45000)});
    if(!clean(result.text,12000)||result.finishReason==='length')return res.status(502).json({error:'A IA não concluiu o roteiro. Tente novamente.'});
    return res.json({ok:true,script:clean(result.text,12000),model:clean(result.model||model,100),facts,usage:result.usage,notice:'Revise o roteiro antes de publicar. O preço só foi incluído porque havia verificação oficial recente.'});
  }catch(error){
    if(/429|quota|rate.?limit|resource_exhausted/i.test(String(error?.message||'')))await registerGeminiQuotaError();
    console.error('video-studio/script',String(error?.code||error?.message||'AI_ERROR').slice(0,120));
    if(isSetupRequired(error))return res.status(412).json({error:'Configure um provedor de IA em Configurações do projeto → IA. Nenhum custo foi gerado por esta tentativa sem credencial.'});
    return res.status(502).json({error:'Não foi possível gerar o roteiro agora. Você ainda pode usar o roteiro local.'});
  }
}