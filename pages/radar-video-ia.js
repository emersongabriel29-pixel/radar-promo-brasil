export const access='member';
export const methods=['GET'];

export default function(req,res){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.send(String.raw`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#152b40">
<title>Radar Vídeo IA · Radar Promo Brasil</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light;--bg:#f4f6f8;--panel:#fff;--line:#d9e1e7;--text:#172638;--muted:#52647b;--accent:#235fce;--warn:#805600}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 Manrope,system-ui,-apple-system,sans-serif}
main{max-width:1280px;margin:auto;padding:28px clamp(14px,3vw,36px) 60px}a{color:#194eae}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}.back{display:inline-flex;align-items:center;min-height:44px;margin-bottom:12px;color:#194eae;font-size:13px;font-weight:750;text-decoration:none}.back:hover{text-decoration:underline}
.kicker{color:#52647b;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:11px}h1{font-size:clamp(28px,4vw,38px);line-height:1.15;letter-spacing:-.04em;margin:8px 0 12px}p{color:var(--muted)}.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:20px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:clamp(16px,2vw,24px);box-shadow:0 4px 16px #17263808}label{display:block;font-weight:700;margin:15px 0 6px}input,select,textarea{width:100%;min-height:44px;border:1px solid #cbd6de;border-radius:7px;padding:11px;background:#fff;color:var(--text);font:inherit}input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #235fce;outline-offset:2px}button{min-height:44px;border:0;border-radius:7px;background:var(--accent);color:#fff;font:inherit;font-weight:750;padding:11px 16px;cursor:pointer;margin-top:14px;transition:background .16s,transform .16s}button:hover:not(:disabled){background:#194eae}button:disabled{opacity:.55;cursor:wait}.notice{border:1px solid #cbdcf0;background:#edf4fc;padding:13px 15px;border-radius:9px;color:#263d50;font-size:13px}.status{white-space:pre-wrap;margin-top:14px}.product{display:none;margin-top:18px}.product img{max-width:180px;max-height:200px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:9px;padding:8px}.script{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f7f9;border:1px solid var(--line);padding:14px;border-radius:8px;color:var(--text)}.small{font-size:12px;color:var(--muted)}.tag{display:inline-block;border:1px solid var(--line);padding:5px 10px;border-radius:99px;font-size:12px;color:#344c60;background:#fff}.top .tag{font-weight:700}
@media(max-width:720px){.grid{grid-template-columns:1fr}main{padding:18px 13px calc(34px + env(safe-area-inset-bottom))}.card{padding:16px}}
@media(prefers-reduced-motion:reduce){button{transition:none}}
</style>
</head>
<body><main>
<div class="top"><div><a class="back" href="/#studio">← Voltar para Ofertas e IA</a><div class="kicker">Radar Promo Brasil · inteligência artificial</div><h1>Radar Vídeo IA</h1><p>Do link do produto ao roteiro de vídeo, sem inventar características.</p></div><span class="tag">Revisão manual obrigatória</span></div>
<div class="notice">Cole um link individual ou um link curto/perfil de afiliado do Mercado Livre. Se o perfil tiver vários produtos, escolha qual analisar. O link rastreado do produto selecionado será preservado no CTA. Não publica nada automaticamente.</div>
<div class="grid">
<section class="card">
<h2>1. Produto e formato</h2>
<form id="form">
<label for="url">Link do produto ou perfil de afiliado</label><input id="url" name="url" type="url" placeholder="https://meli.la/..." required>
<div id="candidateBox" style="display:none;margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:12px"><label for="candidateSelect">Produtos encontrados no seu perfil</label><select id="candidateSelect"><option value="">Selecione um produto…</option></select><p class="small">Escolha o produto. O Radar usará o link rastreado do cartão correspondente.</p></div>
<label for="style">Estilo do vídeo</label><select id="style"><option value="UGC demonstrativo, natural e honesto">UGC demonstrativo</option><option value="Vitrine de produto, visual e objetivo">Vitrine</option><option value="Oferta com benefício confirmado, sem urgência falsa">Oferta</option><option value="Storytelling curto, sem alegações não comprovadas">Storytelling</option></select>
<label for="duration">Duração pretendida</label><select id="duration"><option value="15">15 segundos</option><option value="30" selected>30 segundos</option><option value="45">45 segundos</option><option value="60">60 segundos</option></select>
<label for="voice">Narração</label><select id="voice"><option value="voz feminina PT-BR">Voz feminina (PT-BR)</option><option value="voz masculina PT-BR">Voz masculina (PT-BR)</option><option value="sem narração, somente textos na tela">Sem narração</option></select>
<label for="dest">Destino pretendido</label><select id="dest"><option>Shopee Vídeo</option><option>Mercado Livre Vídeos</option><option>TikTok</option><option>Kwai</option><option>Todos (preparar versões separadas)</option></select>
<label for="notes">Orientações extras (opcional)</label><textarea id="notes" rows="3" maxlength="500" placeholder="Ex.: destacar apenas características confirmadas"></textarea>
<label for="scriptProvider">Como gerar o roteiro</label><select id="scriptProvider"><option value="local" selected>Modelo local gratuito (padrão)</option><option value="openai">OpenAI (pode consumir créditos configurados)</option><option value="gemini">Gemini (pode consumir créditos configurados)</option></select>
<p class="small">OpenAI e Gemini permanecem disponíveis. Só são chamados quando você os seleciona; não há troca automática de provedor.</p>
<button id="submit" type="submit">Analisar link e gerar roteiro</button>
<div id="status" class="status" role="status" aria-live="polite"></div>
</form>
</section>
<section class="card">
<h2>2. Produto verificado</h2><p>O sistema deve usar os dados retornados pela fonte oficial. Se o link não identificar um anúncio individual, não inventará título nem imagem.</p>
<div id="product" class="product"><img id="image" alt="Imagem original do produto"><h3 id="title"></h3><p id="facts"></p><a id="source" target="_blank" rel="noopener noreferrer">Abrir anúncio original</a></div>
<h2 style="margin-top:28px">3. Roteiro para revisão</h2><div id="script" class="script">O roteiro aparecerá aqui após a análise. Nada será publicado automaticamente.</div>
<button id="copy" type="button" style="display:none">Copiar roteiro</button>
<h2 style="margin-top:28px">4. Composição visual</h2><p>Prévia animada usando a imagem original como camada. A composição não redesenha o produto.</p>
<p id="videoSetup" class="small" role="status" aria-live="polite">O modelo local é o padrão. OpenAI e Gemini só são chamados quando selecionados; a geração Runway pode consumir créditos e exige configuração.</p>
<canvas id="videoCanvas" width="720" height="1280" style="width:100%;max-width:360px;border-radius:12px;background:#101a2a;display:block;margin:12px auto"></canvas>
<label for="videoProvider">Provedor para gerar vídeo real</label><select id="videoProvider"><option value="RUNWAY">Runway (requer chave e pode consumir créditos)</option><option value="GOOGLE">Google Gemini Omni Flash (API paga; requer GEMINI_API_KEY)</option></select><p class="small">A prévia local continua gratuita. Vídeos reais só são solicitados após clicar no botão e podem gerar cobrança no provedor escolhido.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="preview" type="button" disabled>Pré-visualizar</button><button id="render" type="button" disabled>Exportar prévia local</button><button id="aiRender" type="button" disabled>Gerar vídeo real (pode usar créditos)</button></div>
<div id="renderStatus" class="small" aria-live="polite"></div>
<video id="aiVideo" controls playsinline hidden style="width:100%;max-width:360px;border-radius:12px;margin:12px auto" aria-label="Vídeo gerado pelo Runway"></video><a id="aiDownload" hidden download>Baixar vídeo gerado</a>
<p class="small">A prévia e a exportação local são feitas no navegador. Ao clicar em Gerar vídeo pelo Runway, o Radar envia o produto e o roteiro ao provedor externo; a geração pode consumir créditos. Confira produto e informações antes de publicar.</p>
</section></div>
<p class="small" style="margin-top:22px">Ainda não incluídos: extração automática em Shopee/Amazon/Magalu, avatar, tendências verificadas e publicação por API oficial. Nenhum dos botões publica ou executa workflows do n8n.</p>
</main>
<script>
const form=document.getElementById('form'),statusEl=document.getElementById('status'),submit=document.getElementById('submit'),candidateBox=document.getElementById('candidateBox'),candidateSelect=document.getElementById('candidateSelect');
form.addEventListener('submit',async e=>{
 e.preventDefault();submit.disabled=true;statusEl.textContent='Resolvendo link e analisando produto…';
 document.getElementById('product').style.display='none';document.getElementById('script').textContent='Aguardando resultado…';document.getElementById('copy').style.display='none';aiRenderBtn.disabled=true;scriptReady=false;document.getElementById('aiVideo').hidden=true;document.getElementById('aiDownload').hidden=true;currentAiJobId='';
 try{
  const selectedItemId=candidateSelect.value||'';
  const r=await fetch('/api/ai/video-ia',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:document.getElementById('url').value,selectedItemId,style:document.getElementById('style').value,duration:Number(document.getElementById('duration').value),voice:document.getElementById('voice').value,destination:document.getElementById('dest').value,notes:document.getElementById('notes').value,scriptProvider:document.getElementById('scriptProvider').value})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Não foi possível analisar o link.');
  if(data.selectionRequired){
   candidateSelect.innerHTML='<option value="">Selecione um produto…</option>';
   for(const c of data.candidates){const o=document.createElement('option');o.value=c.itemId;o.textContent=c.title+' ('+c.itemId+')';candidateSelect.appendChild(o)}
   candidateBox.style.display='block';if(data.profileUrl)document.getElementById('url').value=data.profileUrl;statusEl.textContent='Encontrei '+data.candidates.length+' produtos no perfil. Escolha um produto e clique novamente em “Analisar link e gerar roteiro”.';document.getElementById('script').textContent='Selecione um produto para continuar.';return;
  }
  candidateBox.style.display='none';
  const p=data.product;document.getElementById('image').src=p.imageUrl;document.getElementById('title').textContent=p.title;
  document.getElementById('facts').textContent='Preço informado pela fonte: '+(p.price==null?'não disponível':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(p.price))+'\nFonte dos dados: '+(p.dataSource==='official_api'?'API oficial':'cartão do perfil de afiliado; preço e especificações não confirmados')+'\nO link abaixo preserva o rastreamento de afiliado.';
  document.getElementById('source').href=p.productUrl;document.getElementById('source').textContent='Abrir link de afiliado do produto';document.getElementById('product').style.display='block';
  document.getElementById('script').textContent=data.script;document.getElementById('copy').style.display='inline-block';scriptReady=true;updateAiRenderButton();statusEl.textContent='Roteiro gerado para revisão. '+(data.notice||'')+' Nenhuma publicação foi feita.';
  renderStatus.textContent='Roteiro pronto. A prévia local é gratuita. O provedor selecionado só será chamado após clique explícito.';
 }catch(err){statusEl.textContent=err.message;document.getElementById('script').textContent='Roteiro não gerado.'}
 finally{submit.disabled=false}
});
document.getElementById('copy').addEventListener('click',async()=>{await navigator.clipboard.writeText(document.getElementById('script').textContent);statusEl.textContent='Roteiro copiado.'});
const canvas=document.getElementById('videoCanvas'),ctx=canvas.getContext('2d'),previewBtn=document.getElementById('preview'),renderBtn=document.getElementById('render'),renderStatus=document.getElementById('renderStatus'),aiRenderBtn=document.getElementById('aiRender');
let videoProductImage=null,animationFrame=0,recording=false,currentAiJobId='',currentAiProvider='RUNWAY',runwayReady=false,runwayAction='',googleReady=false,googleAction='',scriptReady=false;
function updateAiRenderButton(){const provider=document.getElementById('videoProvider').value,ready=provider==='GOOGLE'?googleReady:runwayReady;aiRenderBtn.disabled=!(ready&&scriptReady);aiRenderBtn.textContent=provider==='GOOGLE'?'Gerar vídeo com Google Gemini (pode consumir créditos)':'Gerar vídeo pelo Runway (pode usar créditos)';}
async function checkVideoReadiness(){
 const message=document.getElementById('videoSetup');
 try{
  const response=await fetch('/api/readiness',{headers:{Accept:'application/json'}}),data=await response.json();
  if(!response.ok)throw new Error(data.error||'Falha ao consultar a configuração.');
  const status=(data.external||[]).find(item=>item.key==='runway'),google=(data.external||[]).find(item=>item.key==='geminiVideo');runwayReady=Boolean(status?.ready);runwayAction=status?.action||'Confira as conexões do projeto.';googleReady=Boolean(google?.ready);googleAction=google?.action||'Configure GEMINI_API_KEY.';
  message.textContent='Runway: '+(runwayReady?'configurado. ':'não configurado. ')+'Google Gemini: '+(googleReady?'configurado. ':'não configurado. ')+(googleReady?'A geração Google pode consumir créditos.':googleAction)+' A prévia local é gratuita; vídeos reais só são solicitados após clique explícito.';
 }catch(error){runwayReady=false;googleReady=false;runwayAction='Atualize a página ou confira as conexões do projeto.';googleAction=runwayAction;message.textContent='Não foi possível verificar os provedores. A geração real fica bloqueada até confirmar a conexão.'}
 updateAiRenderButton();
}
checkVideoReadiness();
document.getElementById('videoProvider').addEventListener('change',updateAiRenderButton);
function drawFrame(t){
 const W=canvas.width,H=canvas.height,sec=t/1000;ctx.fillStyle='#101a2a';ctx.fillRect(0,0,W,H);
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#142b43');grad.addColorStop(1,'#0b1320');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#5ee0b5';ctx.font='bold 26px system-ui';ctx.fillText('RADAR VÍDEO IA',42,70);
 ctx.fillStyle='#fff';ctx.font='bold 40px system-ui';wrapText(ctx,document.getElementById('title').textContent||'Produto',42,130,W-84,50,3);
 if(videoProductImage&&videoProductImage.complete&&videoProductImage.naturalWidth){
  const maxW=W-100,maxH=H*.48,scale=Math.min(maxW/videoProductImage.naturalWidth,maxH/videoProductImage.naturalHeight)*(1+0.025*Math.sin(sec*1.5));
  const iw=videoProductImage.naturalWidth*scale,ih=videoProductImage.naturalHeight*scale;
  ctx.save();ctx.beginPath();ctx.roundRect(32,280,W-64,H*.49,24);ctx.clip();ctx.fillStyle='#fff';ctx.fillRect(32,280,W-64,H*.49);
  ctx.drawImage(videoProductImage,(W-iw)/2,280+(H*.49-ih)/2,iw,ih);ctx.restore();
 }
 ctx.fillStyle='#5ee0b5';ctx.fillRect(42,H-205,W-84,4);ctx.fillStyle='#fff';ctx.font='bold 29px system-ui';ctx.fillText('Confira os detalhes',42,H-155);
 ctx.font='22px system-ui';ctx.fillStyle='#d1deeb';ctx.fillText('Link original na legenda',42,H-112);ctx.fillStyle='#9fb0c5';ctx.font='18px system-ui';ctx.fillText('Verifique preço e condições na loja',42,H-65);
}
function wrapText(c,text,x,y,maxWidth,lineHeight,maxLines){const words=String(text).split(/\s+/),lines=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(c.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);lines.slice(0,maxLines).forEach((l,i)=>c.fillText(l,x,y+i*lineHeight))}
function productImageReady(){const source=document.getElementById('image').src;if(!source)return;const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{videoProductImage=img;previewBtn.disabled=false;renderBtn.disabled=false;drawFrame(0);renderStatus.textContent='Imagem original carregada. Prévia pronta.'};img.onerror=()=>{videoProductImage=null;previewBtn.disabled=true;renderBtn.disabled=true;renderStatus.textContent='A imagem não permite composição/exportação cross-origin neste navegador. Não foi usada imagem substituta.'};img.src=source}
previewBtn.addEventListener('click',()=>{if(!videoProductImage)return;const start=performance.now();function tick(now){drawFrame(now-start);if(now-start<5000)animationFrame=requestAnimationFrame(tick);else drawFrame(5000)}cancelAnimationFrame(animationFrame);animationFrame=requestAnimationFrame(tick)});
renderBtn.addEventListener('click',()=>{
 if(!videoProductImage||recording)return;
 const supported=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t));
 if(!supported){renderStatus.textContent='Este navegador não oferece gravação de vídeo compatível.';return}
 try{recording=true;renderBtn.disabled=true;previewBtn.disabled=true;renderStatus.textContent='Compondo 15 segundos de vídeo localmente…';drawFrame(0);
  const stream=canvas.captureStream(30),chunks=[],rec=new MediaRecorder(stream,{mimeType:supported,videoBitsPerSecond:5000000});
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onerror=()=>{stream.getTracks().forEach(t=>t.stop());recording=false;renderBtn.disabled=false;previewBtn.disabled=false;renderStatus.textContent='Falha na gravação local.'};
  rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:supported}),url=URL.createObjectURL(blob),a=document.createElement('a'),ext=supported.includes('mp4')?'mp4':'webm';a.href=url;a.download='radar-video-ia.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);recording=false;renderBtn.disabled=false;previewBtn.disabled=false;renderStatus.textContent='Vídeo gerado e baixado ('+ext.toUpperCase()+'). Revise antes de publicar.'};
  rec.start();const start=performance.now();function frame(now){drawFrame(now-start);if(now-start>=15000)rec.stop();else requestAnimationFrame(frame)}requestAnimationFrame(frame);
 }catch(err){recording=false;renderBtn.disabled=false;previewBtn.disabled=false;renderStatus.textContent='Não foi possível exportar neste navegador: '+err.message}
});
document.getElementById('image').addEventListener('load',productImageReady);
async function pollAiJob(jobId){
 for(let attempt=0;attempt<40;attempt++){
  await new Promise(resolve=>setTimeout(resolve,15000));
  try{
   const response=await fetch('/api/ai/media?id='+encodeURIComponent(jobId),{headers:{Accept:'application/json'}}),job=await response.json();
   if(!response.ok)throw new Error(job.error||'Falha ao consultar o vídeo.');
   if(job.status==='COMPLETED'||job.status==='FALLBACK_COMPLETED'){
    if(!job.url)throw new Error('A renderização terminou sem arquivo disponível.');
    const video=document.getElementById('aiVideo'),download=document.getElementById('aiDownload');video.src=job.url;video.hidden=false;video.load();download.href=job.url;download.download='radar-video-ia-'+jobId+'.mp4';download.hidden=false;currentAiJobId='';currentAiProvider='RUNWAY';document.getElementById('videoProvider').disabled=false;updateAiRenderButton();renderStatus.textContent='Vídeo pronto. Revise as imagens e alegações antes de publicar.';return;
   }
   if(job.status==='FAILED')throw new Error(job.lastError||'O provedor não concluiu o vídeo.');
   renderStatus.textContent=(currentAiProvider==='GOOGLE'?'Google Gemini: ':'Runway: ')+(job.status||'PROCESSING')+'. Verificação '+(attempt+1)+' de 40.';
  }catch(error){currentAiJobId='';currentAiProvider='RUNWAY';document.getElementById('videoProvider').disabled=false;updateAiRenderButton();renderStatus.textContent=error.message;return}
 }
 aiRenderBtn.disabled=false;aiRenderBtn.textContent='Verificar vídeo em andamento';renderStatus.textContent='A renderização continua. Clique em verificar para consultar novamente.';
}
aiRenderBtn.addEventListener('click',async()=>{
 const provider=document.getElementById('videoProvider').value;if(aiRenderBtn.disabled||!(provider==='GOOGLE'?googleReady:runwayReady)||!scriptReady)return;
 if(currentAiJobId){aiRenderBtn.disabled=true;await pollAiJob(currentAiJobId);return}
 const image=document.getElementById('image').src,title=document.getElementById('title').textContent,scriptText=document.getElementById('script').textContent;
 aiRenderBtn.disabled=true;document.getElementById('videoProvider').disabled=true;renderStatus.textContent='Iniciando renderização '+(provider==='GOOGLE'?'Google Gemini':'Runway')+'. Esta ação pode consumir créditos…';
 const style=document.getElementById('style').value,excerpt=scriptText.replace(/\s+/g,' ').slice(0,700),prompt=('Create a 10-second vertical 9:16 product showcase. Preserve the supplied product identity, packaging and colors; animate camera and background only. Do not invent claims, prices, discounts or text. Product: '+title+'. Style: '+style+'. Script: '+excerpt).slice(0,1380);
 try{
  const response=await fetch('/api/ai/media',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({kind:'VIDEO',provider,title,prompt,imageUrl:image,ratio:'9:16',duration:10,style})}),data=await response.json();
  if(!response.ok)throw new Error(data.error||'Não foi possível iniciar o vídeo.');
  if(!data.jobId)throw new Error('O Radar não recebeu o identificador da renderização.');
  currentAiJobId=data.jobId;currentAiProvider=provider;renderStatus.textContent='Renderização iniciada; verificando o andamento. Esta etapa pode consumir créditos.';await pollAiJob(currentAiJobId);
 }catch(error){document.getElementById('videoProvider').disabled=false;updateAiRenderButton();renderStatus.textContent=error.message}
});
</script></body></html>`);
}
