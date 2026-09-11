import { ai, db } from 'hatchable';

export const access='member';
export const methods=['GET','POST'];

const TASKS=['PROFILE_KIT','CONTENT_PLAN','POST_PACKAGE','ADS_STRATEGY','DESIGN_BRIEF','GROWTH_AUDIT'];
const CHANNELS=['INSTAGRAM','FACEBOOK','META','BOTH'];
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const uid=()=>crypto.randomUUID();

async function account(member){return (await db.query('SELECT id,name FROM accounts WHERE owner_member_id=$1',[String(member.id)])).rows[0]}
function https(v){try{return new URL(v).protocol==='https:'}catch{return false}}
function fallback(task,topic,goal,channel){
  const base='Marca: Radar Promo Brasil\nCanais: '+channel+'\nObjetivo: '+goal+'\nTema: '+topic;
  if(task==='PROFILE_KIT')return base+'\n\nNome: Radar Promo Brasil\nCategoria: Compras e varejo\nUsuário sugerido: @radarpromobrasil\nBio: Ofertas verificadas, cupons e achadinhos todos os dias. Confira condições e compre pelo link.\nPilares: achadinhos, cupons, comparativos, prova social e alertas de preço.\nIdentidade: azul-marinho, laranja e verde; títulos fortes, preços legíveis e uma oferta por peça.';
  if(task==='CONTENT_PLAN')return base+'\n\nPlano de 7 dias:\n1. Carrossel com 5 achadinhos\n2. Reel curto de produto útil\n3. Stories com enquete de categoria\n4. Oferta relâmpago confirmada\n5. Comparativo de preço\n6. Cupom da semana\n7. Ranking dos mais clicados\n\nCadência: 1 post, 1 Reel e 4 a 8 Stories por dia, ajustados pelos resultados reais.';
  if(task==='POST_PACKAGE')return base+'\n\nFeed: chamada clara, benefício, preço confirmado e CTA.\nStories: gancho, prova/benefício e link.\nReel: 3 segundos de gancho, demonstração e CTA final.\nFacebook: texto mais explicativo com link e aviso de afiliado.\nRegra: nunca inventar preço, desconto, estoque, frete ou cupom.';
  if(task==='ADS_STRATEGY')return base+'\n\nCampanha em rascunho:\nObjetivo: tráfego ou vendas conforme rastreamento disponível.\nPúblico: começar amplo e separar remarketing.\nCriativos: produto, benefício e preço confirmado.\nTeste: 3 criativos por conjunto, orçamento pequeno e revisão após volume suficiente.\nMétricas: CTR, CPC, conversão, custo por venda e ROAS. Nenhum anúncio deve ser ativado sem autorização e orçamento confirmado.';
  if(task==='DESIGN_BRIEF')return base+'\n\nBrief: produto em destaque, fundo limpo, contraste alto, título de até 6 palavras, preço atual dominante e selo de desconto somente quando calculado. Formatos: 1080x1350 feed, 1080x1920 Stories/Reels e 1200x628 Facebook. Manter área segura e não cobrir o produto.';
  return base+'\n\nAuditoria: revisar bio, link, identidade, frequência, alcance, retenção, cliques, conversão e custo. Priorizar conteúdos com clique e venda comprovados; pausar formatos repetidamente fracos após amostra suficiente.';
}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const a=await account(req.member);if(!a)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  if(req.method==='GET')return res.json({ok:true,agent:{name:'Radar Social',role:'Especialista em mídias sociais, design e tráfego',status:'ACTIVE',tasks:TASKS,channels:CHANNELS},profile:{brand:'Radar Promo Brasil',suggestedHandle:'@radarpromobrasil',category:'Compras e varejo',instagramStatus:'AWAITING_OAUTH',facebookStatus:'AWAITING_OAUTH'}});
  const b=req.body||{},task=clean(b.task,40).toUpperCase(),channel=clean(b.channel,30).toUpperCase()||'BOTH';
  const topic=clean(b.topic,300)||'ofertas, cupons e produtos afiliados',goal=clean(b.goal,200)||'aumentar cliques qualificados e vendas',audience=clean(b.audience,200)||'pessoas que procuram promoções confiáveis no Brasil';
  if(!TASKS.includes(task)||!CHANNELS.includes(channel))return res.status(400).json({error:'Tarefa ou canal inválido.'});
  const link=clean(b.link,1200);if(link&&!https(link))return res.status(400).json({error:'Use um link HTTPS válido.'});
  const facts=[clean(b.product,220)&&'Produto confirmado: '+clean(b.product,220),clean(b.price,60)&&'Preço confirmado: '+clean(b.price,60),clean(b.coupon,100)&&'Cupom confirmado: '+clean(b.coupon,100),link&&'Link confirmado: '+link].filter(Boolean).join('\n');
  const prompt=['Tarefa: '+task,'Canal: '+channel,'Tema: '+topic,'Objetivo: '+goal,'Público: '+audience,facts,'Crie uma entrega prática em português do Brasil. Quando for perfil, entregue nome, categoria, usuário, bio, pilares e identidade. Quando for conteúdo, entregue formatos, textos e calendário. Quando for tráfego, mantenha campanhas como rascunho e inclua métricas, teste e critérios de pausa.'].filter(Boolean).join('\n');
  let content='',model='automatic',notice='';
  try{
    const result=await ai.generateText({purpose:'social-media-specialist',model:'gemini',userId:String(req.member.id),maxTokens:5000,system:'Você é Radar Social, estrategista sênior de Instagram, Facebook, design de performance e tráfego pago para afiliados. Seja específico, ético e orientado a conversão. Não invente preço, desconto, cupom, estoque, frete, avaliações ou resultados. Não diga que publicou ou ativou campanhas. Respeite LGPD, políticas da Meta e transparência de link afiliado.',prompt,signal:AbortSignal.timeout(60000)});
    if(result.finishReason==='length')throw new Error('length');
    content=clean(result.text,10000);model=clean(result.model,80)||'gemini';
  }catch(e){content=fallback(task,topic,goal,channel);notice='O plano foi concluído pelo modo automático seguro.'}
  if(facts)content+='\n\nDADOS CONFIRMADOS\n'+facts+'\nAviso: link de afiliado; condições podem mudar.';
  const saved=(await db.query('INSERT INTO content_assets(id,account_id,kind,channel,provider_model,content,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,created_at AS "createdAt"',[uid(),a.id,'SOCIAL_AGENT',channel,model,content,'DRAFT'])).rows[0];
  return res.json({ok:true,id:saved.id,agent:'Radar Social',task,channel,content,model,notice,externalPublishing:'AWAITING_META_OAUTH',createdAt:saved.createdAt});
}
