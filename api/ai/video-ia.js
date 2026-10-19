import { ai, db } from 'hatchable';
import { meliGet } from 'lib/direct-connectors.js';
import { isSetupRequired } from 'lib/media.js';

export const access='member';
export const methods=['POST'];

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
function buildLocalScript({title,attributes,duration,voice,style,destination,notes}){
  const facts=attributes.length?attributes.map(a=>a.name+': '+a.value).join('; '):'Confira as especificações diretamente no anúncio.';
  const scenes=duration<=15
    ?[['0–3s','Abertura','Conheça: '+title+'.'],['3–10s','Produto','Informações do anúncio: '+facts],['10–15s','Encerramento','Veja fotos, detalhes e condições atualizadas no anúncio original.']]
    :duration<=30
      ?[['0–4s','Abertura','Uma opção para conhecer: '+title+'.'],['4–12s','Produto','O anúncio informa: '+facts],['12–22s','Detalhes','Confira as imagens e a descrição completa para decidir se combina com o que você procura.'],['22–'+duration+'s','Encerramento','Consulte preço, disponibilidade e condições atuais no anúncio original.']]
      :[['0–5s','Abertura','Vamos conhecer o produto: '+title+'.'],['5–15s','Informações confirmadas','No anúncio, constam: '+facts],['15–'+Math.round(duration*.65)+'s','Exploração','Confira as imagens, a descrição e os detalhes diretamente na página do produto.'],[Math.round(duration*.65)+'–'+duration+'s','Encerramento','Acesse o anúncio original para consultar preço, disponibilidade e condições atualizadas.']];
  return ['ROTEIRO MODELO LOCAL · '+duration+'s · '+voice,'Estilo: '+style+' · Destino: '+destination,'Produto: '+title,notes?'Orientação: '+notes:'','',...scenes.flatMap(([time,name,line])=>[time+' | '+name,line,'']),'Revisão: confirme os dados na página original antes de publicar. O roteiro não informa preço, desconto, estoque ou resultados não verificados.'].filter((line,index)=>line!==''||index===3).join('\n');
}
const hostAllowed=host=>host==='meli.la'||host.endsWith('.meli.la')||host==='mercadolivre.com.br'||host.endsWith('.mercadolivre.com.br')||host==='mercadolivre.com'||host.endsWith('.mercadolivre.com');
const isHttpsAllowed=value=>{try{const u=new URL(value);return u.protocol==='https:'&&hostAllowed(u.hostname.toLowerCase())}catch{return false}};
const decodeHtml=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g,' ').trim();

async function fetchAllowedUrl(raw){
  let current=raw;
  for(let i=0;i<6;i++){
    if(!isHttpsAllowed(current))throw new Error('LINK_HOST_NOT_ALLOWED');
    const response=await fetch(current,{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0 (compatible; RadarPromoBrasil/1.0)','Accept':'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(10000)});
    if(response.status>=300&&response.status<400){
      const location=response.headers.get('location');
      if(!location)throw new Error('REDIRECT_WITHOUT_LOCATION');
      current=/^https:\/\//i.test(location)?new URL(location).toString():new URL(location,current).toString();continue;
    }
    if(!response.ok)throw new Error('LINK_FETCH_'+response.status);
    return {url:current,html:await response.text(),status:response.status};
  }
  throw new Error('TOO_MANY_REDIRECTS');
}

function parseCandidates(rawHtml,profileUrl){
  const html=String(rawHtml||'').replace(/\\+"/g,'"').replace(/\\\\u002F/g,'/');
  const found=[],seen=new Set();
  const anchorRe=/<a\b(?=[^>]*class=["'][^"']*poly-component__title)(?=[^>]*href=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=anchorRe.exec(html))&&found.length<60){
    let href=decodeHtml(m[1]);
    try{href=/^https:\/\//i.test(href)?new URL(href).toString():new URL(href,profileUrl).toString()}catch{continue}
    if(!isHttpsAllowed(href))continue;
    const u=new URL(href),fragmentParams=new URLSearchParams(u.hash.replace(/^#/,'')),itemId=clean(u.searchParams.get('wid')||fragmentParams.get('wid'),40).match(/^MLB\d{6,}$/i)?.[0]?.toUpperCase();
    const title=clean(decodeHtml(m[2].replace(/<[^>]*>/g,' ')),220);
    if(!itemId||!title||seen.has(itemId))continue;
    seen.add(itemId);
    const imgStart=html.lastIndexOf('<img',m.index);
    const imgTag=imgStart>=0&&m.index-imgStart<5000?html.slice(imgStart,html.indexOf('>',imgStart)+1):'';
    const im=imgTag.match(/(?:src|data-src)=["']([^"']+)["']/i);
    let imageUrl=im?decodeHtml(im[1]):'';
    if(imageUrl.startsWith('//'))imageUrl='https:'+imageUrl;
    if(imageUrl.startsWith('http:'))imageUrl='https:'+imageUrl.slice(5);
    if(!/^https:\/\//i.test(imageUrl))imageUrl='';
    found.push({itemId,title,imageUrl,affiliateUrl:href});
  }
  return found;
}

async function resolveLink(raw){
  if(!isHttpsAllowed(raw))return {kind:'invalid'};
  const fetched=await fetchAllowedUrl(raw),u=new URL(fetched.url);
  if(/\/social\//i.test(u.pathname)||/affiliate-profile/i.test(fetched.html))return {kind:'profile',profileUrl:fetched.url,candidates:parseCandidates(fetched.html,fetched.url)};
  const fragmentParams=new URLSearchParams(u.hash.replace(/^#/,''));
  const itemId=clean(u.searchParams.get('wid')||fragmentParams.get('wid'),40).match(/^MLB\d{6,}$/i)?.[0]?.toUpperCase()||((u.pathname+' '+u.search).match(/MLB-?(\d{9,})/i)?.[0]?.replace('-','').toUpperCase()||null);
  return {kind:'item',itemId,productUrl:raw,finalUrl:fetched.url};
}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const b=req.body||{},url=clean(b.url,2000),selectedItemId=clean(b.selectedItemId,40).toUpperCase();
  if(!isHttpsAllowed(url))return res.status(400).json({error:'Use um link HTTPS do Mercado Livre ou meli.la.'});
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel do Radar uma vez para inicializar sua conta.'});
  try{
    const resolved=await resolveLink(url);
    if(resolved.kind==='invalid')return res.status(400).json({error:'Link inválido ou domínio não permitido.'});
    if(resolved.kind==='profile'){
      if(!resolved.candidates.length)return res.status(424).json({error:'O perfil abriu, mas não consegui extrair produtos de forma confiável. Tente copiar o link de um produto individual.'});
      if(!selectedItemId)return res.json({ok:true,selectionRequired:true,profileUrl:resolved.profileUrl,candidates:resolved.candidates.map(({itemId,title,imageUrl,affiliateUrl})=>({itemId,title,imageUrl,affiliateUrl})),notice:'Escolha um produto. O link de afiliado de cada cartão será preservado.'});
      const chosen=resolved.candidates.find(p=>p.itemId===selectedItemId);
      if(!chosen)return res.status(400).json({error:'O produto selecionado não pertence aos itens encontrados neste perfil.'});
      resolved.itemId=chosen.itemId;resolved.productUrl=chosen.affiliateUrl;resolved.candidate=chosen;
    }
    if(!resolved.itemId)return res.status(400).json({error:'Não consegui identificar o ID do anúncio. Envie um link individual ou um link de perfil de afiliado com cartões de produtos.'});
    const result=await meliGet(account.id,'/items/'+encodeURIComponent(resolved.itemId));
    let p=null,source='official_api',apiWarning='';
    if(result.status>=200&&result.status<300&&result.body?.id)p=result.body;
    else if((result.status===401||result.status===403)&&resolved.candidate?.title){
      p={id:resolved.itemId,title:resolved.candidate.title,thumbnail:resolved.candidate.imageUrl,price:null,attributes:[]};
      source='affiliate_profile_card';
      apiWarning='A API de item retornou HTTP '+result.status+'. Título e imagem foram obtidos do cartão do perfil de afiliado; preço e especificações não foram confirmados.';
    }else{
      if(result.status===401||result.status===403)return res.status(412).json({error:'A API oficial do Mercado Livre retornou HTTP '+result.status+' para este anúncio. Nenhum preço ou especificação será presumido. Tente novamente após revisar a conexão/permissões.'});
      return res.status(424).json({error:'A API oficial não confirmou este anúncio. Confira o link e tente novamente.'});
    }
    const imageUrl=String(p.thumbnail||p.pictures?.[0]?.secure_url||p.pictures?.[0]?.url||resolved.candidate?.imageUrl||'').replace(/^http:/,'https:');
    const productUrl=String(resolved.productUrl||url);
    const title=clean(p.title||resolved.candidate?.title,220);
    if(!title||!imageUrl||!/^https:\/\//i.test(imageUrl))return res.status(424).json({error:'A fonte não retornou título e imagem original utilizáveis. A geração foi interrompida.'});
    const attributes=Array.isArray(p.attributes)?p.attributes.slice(0,12).map(a=>({name:clean(a.name,80),value:clean(a.value_name,120)})).filter(a=>a.name&&a.value):[];
    const style=clean(b.style,100)||'UGC demonstrativo, natural e honesto';
    const duration=[15,30,45,60].includes(Number(b.duration))?Number(b.duration):30;
    const voice=clean(b.voice,100)||'voz feminina PT-BR';
    const destination=clean(b.destination,80)||'TikTok';
    const notes=clean(b.notes,500);
    const requestedProvider=['openai','gemini'].includes(b.scriptProvider)?b.scriptProvider:'local';
    const price=Number.isFinite(Number(p.price))&&p.price!=null?Number(p.price):null;
    const facts={title,price,condition:clean(p.condition,30),attributes,dataSource:source};
    let script=buildLocalScript({title,attributes,duration,voice,style,destination,notes}),model='template-local';
    if(requestedProvider!=='local'){
      const prompt=[
        'Crie roteiro curto vertical de produto em português do Brasil.',
        'Duração: '+duration+'s. Estilo: '+style+'. Voz: '+voice+'. Destino: '+destination+'. Orientações: '+(notes||'nenhuma'),
        'Dados confirmados do produto: '+JSON.stringify(facts),
        'Não invente características, compatibilidade, resultados, desconto, frete, estoque, garantia, urgência ou preço promocional. Se faltarem especificações, omita-as. Preserve o link de afiliado e termine indicando revisão humana.'
      ].join('\n');
      model=requestedProvider==='openai'?'gpt-mini':'gemini';
      try{
        const generated=await ai.generateText({purpose:'radar-video-ia-script',model,userId:String(req.member.id),maxTokens:1800,system:'Roteirista de vídeos curtos, preciso e transparente. Não invente fatos de produto.',prompt,signal:AbortSignal.timeout(60000)});
        const generatedText=clean(generated.text,9000);
        if(!generatedText||generated.finishReason==='length')return res.status(502).json({error:'O provedor não produziu um roteiro completo. Tente novamente ou selecione o modo local.'});
        script=generatedText;
      }catch(error){
        if(isSetupRequired(error))return res.status(412).json({error:'O provedor escolhido não está configurado. Escolha o modo local ou configure a credencial do provedor.',code:'AI_SETUP_REQUIRED'});
        throw error;
      }
    }
    return res.json({ok:true,product:{itemId:resolved.itemId,title,price:facts.price,imageUrl,productUrl,attributes,dataSource:source},script,model,stage:'SCRIPT_READY',published:false,videoRendered:false,notice:[apiWarning,requestedProvider==='local'?'Roteiro montado localmente, sem chamadas externas.':('Roteiro gerado pelo provedor selecionado: '+requestedProvider+'. O uso pode consumir créditos do projeto.'),'Avatar, tendências verificadas e publicação ainda não foram implementados.'].filter(Boolean).join(' ')});
  }catch(e){
    console.error('ai/video-ia',JSON.stringify({status:Number(e?.status)||0,code:clean(e?.code||e?.message,80)}));
    if(isSetupRequired(e))return res.status(412).json({error:'O provedor selecionado não está configurado. Escolha o modo local ou configure a credencial do provedor.',code:'AI_SETUP_REQUIRED'});
    if(e?.code==='MELI_NOT_CONNECTED')return res.status(412).json({error:'Conecte o Mercado Livre pela conexão oficial do Radar antes de analisar produtos.'});
    if(e?.message==='LINK_HOST_NOT_ALLOWED')return res.status(400).json({error:'O link redirecionou para um domínio não permitido. Nenhuma página foi processada.'});
    if(String(e?.message||'').startsWith('LINK_FETCH_404'))return res.status(424).json({error:'O link curto retornou 404. Cole o link direto do perfil de afiliado do Mercado Livre ou copie um link individual do produto.'});
    return res.status(502).json({error:'Falha ao resolver o link, consultar a fonte ou gerar o roteiro. Nenhum dado ausente foi presumido.'});
  }
}
