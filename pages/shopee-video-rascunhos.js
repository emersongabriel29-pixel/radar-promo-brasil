export const access = 'member';
export const methods = ['GET'];

export default function(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(String.raw`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shopee Video · Rascunhos | Radar Promo Brasil</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light;--bg:#f4f6f8;--panel:#fff;--line:#d9e1e7;--text:#172638;--muted:#52647b;--accent:#235fce}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 Manrope,system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:28px 18px 60px}a{color:#194eae}.kicker{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}h1{font-size:clamp(28px,4vw,38px);line-height:1.15;letter-spacing:-.04em;margin:8px 0}p{color:var(--muted)}.notice{background:#edf4fc;border:1px solid #cbdcf0;border-radius:9px;padding:13px 15px;font-size:13px}.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:18px}.card,.draft{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px}label{display:block;font-weight:700;margin:13px 0 6px}input,textarea{width:100%;min-height:44px;border:1px solid #cbd6de;border-radius:7px;padding:11px;background:#fff;color:var(--text);font:inherit}textarea{resize:vertical}button{min-height:42px;border:0;border-radius:7px;background:var(--accent);color:white;font:inherit;font-weight:750;padding:10px 14px;cursor:pointer;margin:10px 6px 0 0}button.secondary{background:#e8eef4;color:#172638}button.danger{background:#8c2e2e}button:disabled{opacity:.55}.status{white-space:pre-wrap;margin-top:12px}.drafts{display:grid;gap:12px;margin-top:12px}.draft h3{margin:0 0 5px}.draft pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f7f9;padding:12px;border-radius:8px;max-height:220px;overflow:auto}.meta{font-size:12px;color:var(--muted)}.pill{display:inline-block;padding:3px 8px;border:1px solid var(--line);border-radius:99px;font-size:12px}@media(max-width:760px){.grid{grid-template-columns:1fr}main{padding:18px 13px 40px}.card,.draft{padding:15px}}
</style></head><body><main>
<a href="/radar-video-ia">← Voltar para Radar Vídeo IA</a>
<div class="kicker" style="margin-top:18px">Radar Promo Brasil · Shopee Video</div><h1>Fila de rascunhos</h1>
<p>Organize roteiros e referências de produto antes de qualquer publicação.</p>
<div class="notice"><strong>Publicação bloqueada.</strong> Esta versão apenas salva e lista rascunhos. Não chama endpoints de upload/publicação da Shopee, não executa workflows do n8n e não afirma que o acesso de afiliado à API de vídeo foi aprovado. Use a imagem original do anúncio.</div>
<div class="grid"><section class="card"><h2>Novo rascunho</h2><form id="form">
<label for="title">Título do produto</label><input id="title" maxlength="220" required placeholder="Título conforme o anúncio">
<label for="url">Link de afiliado do produto</label><input id="url" type="url" maxlength="2000" required placeholder="https://...shopee.com.br/...">
<label for="image">URL da imagem original (opcional)</label><input id="image" type="url" maxlength="2000" placeholder="URL da imagem do próprio anúncio">
<label for="caption">Legenda / CTA (opcional)</label><textarea id="caption" rows="3" maxlength="2200" placeholder="Texto para revisar antes de publicar"></textarea>
<label for="script">Roteiro do vídeo</label><textarea id="script" rows="8" maxlength="12000" required placeholder="Cole aqui o roteiro aprovado para revisão"></textarea>
<label for="asset">URL HTTPS do vídeo pronto (opcional)</label><input id="asset" type="url" maxlength="2000" placeholder="Link do arquivo de vídeo, se já existir">
<button id="save" type="submit">Salvar rascunho</button><div id="status" class="status" role="status" aria-live="polite"></div>
</form></section>
<section class="card"><h2>Rascunhos salvos</h2><p class="meta">Separados por conta do Radar. Até 100 itens recentes.</p><button id="refresh" class="secondary" type="button">Atualizar lista</button><div id="list" class="drafts" aria-live="polite">Carregando…</div></section></div>
</main><script>
const $=id=>document.getElementById(id),form=$('form'),status=$('status'),list=$('list');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({error:'Resposta inválida'}));if(!r.ok)throw new Error(d.error||'Falha na solicitação');return d}
async function load(){list.textContent='Carregando…';try{const d=await api('/api/shopee-video/drafts');list.innerHTML='';if(!d.drafts.length){list.textContent='Ainda não há rascunhos. Salve o primeiro ao lado.';return}for(const x of d.drafts){const el=document.createElement('article');el.className='draft';el.innerHTML='<span class="pill">RASCUNHO · PUBLICAÇÃO DESATIVADA</span><h3>'+esc(x.productTitle)+'</h3><p class="meta">Criado: '+esc(new Date(x.createdAt).toLocaleString('pt-BR'))+'</p><p><a target="_blank" rel="noopener noreferrer" href="'+esc(x.productUrl)+'">Abrir link de produto/afiliado</a></p>'+(x.productImageUrl?'<p><a target="_blank" rel="noopener noreferrer" href="'+esc(x.productImageUrl)+'">Ver imagem original</a></p>':'')+(x.caption?'<p><strong>Legenda</strong><br>'+esc(x.caption)+'</p>':'')+'<details><summary>Ver roteiro</summary><pre>'+esc(x.script)+'</pre></details>'+(x.videoAssetUrl?'<p><a target="_blank" rel="noopener noreferrer" href="'+esc(x.videoAssetUrl)+'">Abrir vídeo anexado</a></p>':'')+'<button class="danger" data-delete="'+esc(x.id)+'" type="button">Excluir rascunho</button>';list.appendChild(el)} }catch(e){list.textContent=e.message}}
form.addEventListener('submit',async e=>{e.preventDefault();$('save').disabled=true;status.textContent='Salvando rascunho…';try{const d=await api('/api/shopee-video/drafts',{method:'POST',body:JSON.stringify({productTitle:$('title').value,productUrl:$('url').value,productImageUrl:$('image').value,caption:$('caption').value,script:$('script').value,videoAssetUrl:$('asset').value})});status.textContent=d.note||'Rascunho salvo. Nada foi publicado.';form.reset();await load()}catch(e){status.textContent=e.message}finally{$('save').disabled=false}});
$('refresh').addEventListener('click',load);
list.addEventListener('click',async e=>{const b=e.target.closest('[data-delete]');if(!b)return;if(!confirm('Excluir este rascunho?'))return;b.disabled=true;try{await api('/api/shopee-video/drafts?id='+encodeURIComponent(b.dataset.delete),{method:'DELETE'});await load()}catch(err){alert(err.message);b.disabled=false}});
load();
</script></body></html>`);
}