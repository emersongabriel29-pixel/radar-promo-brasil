export const access='member';
export const methods=['GET'];

export default function(req,res){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.send(String.raw`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Radar Vídeo IA · Radar Promo Brasil</title>
<style>
:root{color-scheme:dark;--bg:#0c1422;--panel:#142238;--line:#2a3c54;--text:#eef5fc;--muted:#9fb0c5;--accent:#5ee0b5;--warn:#ffd78a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,sans-serif}
main{max-width:1000px;margin:auto;padding:32px 18px 60px}a{color:var(--accent)}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}
.kicker{color:var(--accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px}h1{font-size:clamp(28px,5vw,42px);line-height:1.1;margin:8px 0 12px}p{color:var(--muted)}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;margin-top:24px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px}label{display:block;font-weight:700;margin:15px 0 6px}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:12px;background:#0c1728;color:var(--text);font:inherit}button{border:0;border-radius:10px;background:var(--accent);color:#06251b;font-weight:850;padding:13px 18px;cursor:pointer;margin-top:18px}button:disabled{opacity:.55;cursor:wait}.notice{border:1px solid #6b5731;background:#2b261b;padding:13px;border-radius:12px;color:var(--warn);font-size:13px}.status{white-space:pre-wrap;margin-top:14px}.product{display:none;margin-top:18px}.product img{max-width:180px;max-height:200px;object-fit:contain;background:#fff;border-radius:10px;padding:8px}.script{white-space:pre-wrap;overflow-wrap:anywhere;background:#0c1728;padding:14px;border-radius:10px}.small{font-size:12px;color:var(--muted)}.tag{display:inline-block;border:1px solid var(--line);padding:4px 8px;border-radius:99px;font-size:12px;color:var(--muted)}
@media(max-width:720px){.grid{grid-template-columns:1fr}main{padding:22px 14px}}
</style>
</head>
<body><main>
<div class="top"><div><div class="kicker">Módulo separado · versão inicial</div><h1>Radar Vídeo IA</h1><p>Do link do produto ao roteiro de vídeo, sem inventar características.</p></div><span class="tag">Revisão manual obrigatória</span></div>
<div class="notice">Esta primeira etapa aceita links individuais de produtos do Mercado Livre usando a conexão oficial já configurada no Radar. A imagem exibida vem da resposta da plataforma. Não renderiza MP4, não cria avatar e não publica nada ainda.</div>
<div class="grid">
<section class="card">
<h2>1. Produto e formato</h2>
<form id="form">
<label for="url">Link individual do produto</label><input id="url" name="url" type="url" placeholder="https://www.mercadolivre.com.br/..." required>
<label for="style">Estilo do vídeo</label><select id="style"><option value="UGC demonstrativo, natural e honesto">UGC demonstrativo</option><option value="Vitrine de produto, visual e objetivo">Vitrine</option><option value="Oferta com benefício confirmado, sem urgência falsa">Oferta</option><option value="Storytelling curto, sem alegações não comprovadas">Storytelling</option></select>
<label for="duration">Duração pretendida</label><select id="duration"><option value="15">15 segundos</option><option value="30" selected>30 segundos</option><option value="45">45 segundos</option><option value="60">60 segundos</option></select>
<label for="voice">Narração</label><select id="voice"><option value="voz feminina PT-BR">Voz feminina (PT-BR)</option><option value="voz masculina PT-BR">Voz masculina (PT-BR)</option><option value="sem narração, somente textos na tela">Sem narração</option></select>
<label for="dest">Destino pretendido</label><select id="dest"><option>Shopee Vídeo</option><option>Mercado Livre Vídeos</option><option>TikTok</option><option>Kwai</option><option>Todos (preparar versões separadas)</option></select>
<label for="notes">Orientações extras (opcional)</label><textarea id="notes" rows="3" maxlength="500" placeholder="Ex.: destacar apenas características confirmadas"></textarea>
<button id="submit" type="submit">Analisar link e gerar roteiro</button>
<div id="status" class="status" role="status" aria-live="polite"></div>
</form>
</section>
<section class="card">
<h2>2. Produto verificado</h2><p>O sistema deve usar os dados retornados pela fonte oficial. Se o link não identificar um anúncio individual, não inventará título nem imagem.</p>
<div id="product" class="product"><img id="image" alt="Imagem original do produto"><h3 id="title"></h3><p id="facts"></p><a id="source" target="_blank" rel="noopener noreferrer">Abrir anúncio original</a></div>
<h2 style="margin-top:28px">3. Roteiro para revisão</h2><div id="script" class="script">O roteiro aparecerá aqui após a análise. Nada será publicado automaticamente.</div>
<button id="copy" type="button" style="display:none">Copiar roteiro</button>
<p class="small">A imagem do produto deve permanecer original. Para o futuro MP4, o produto será uma camada visual preservada; não será redesenhado por geração de vídeo.</p>
</section></div>
<p class="small" style="margin-top:22px">Ainda não incluídos: extração automática em Shopee/Amazon/Magalu, avatar, renderização MP4, tendências verificadas e publicação por API oficial. O botão não publica nem executa workflows do n8n.</p>
</main>
<script>
const form=document.getElementById('form'),statusEl=document.getElementById('status'),submit=document.getElementById('submit');
form.addEventListener('submit',async e=>{
 e.preventDefault();submit.disabled=true;statusEl.textContent='Consultando a fonte oficial e preparando o roteiro…';
 document.getElementById('product').style.display='none';document.getElementById('script').textContent='Aguardando resultado…';document.getElementById('copy').style.display='none';
 try{
  const r=await fetch('/api/ai/video-ia',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:document.getElementById('url').value,style:document.getElementById('style').value,duration:Number(document.getElementById('duration').value),voice:document.getElementById('voice').value,destination:document.getElementById('dest').value,notes:document.getElementById('notes').value})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Não foi possível analisar o link.');
  const p=data.product;document.getElementById('image').src=p.imageUrl;document.getElementById('title').textContent=p.title;document.getElementById('facts').textContent='Preço informado pela fonte: '+(p.price==null?'não disponível':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(p.price))+'\nCondição/estoque não serão presumidos.';document.getElementById('source').href=p.productUrl;document.getElementById('product').style.display='block';
  document.getElementById('script').textContent=data.script;document.getElementById('copy').style.display='inline-block';statusEl.textContent='Roteiro gerado. Revise os fatos antes de usar. Nenhuma publicação foi feita.';
 }catch(err){statusEl.textContent=err.message;document.getElementById('script').textContent='Roteiro não gerado.'}
 finally{submit.disabled=false}
});
document.getElementById('copy').addEventListener('click',async()=>{await navigator.clipboard.writeText(document.getElementById('script').textContent);statusEl.textContent='Roteiro copiado.'});
</script></body></html>`);
}