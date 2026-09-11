import fs from 'node:fs';
import path from 'node:path';

export const access = 'member';

const htmlPath = path.resolve(process.cwd(), 'pages', 'index.html');
let cachedHtml = null;

const radarScript = `<script>
(function(){
  if(window.__radarIntegrated)return;
  window.__radarIntegrated=true;
  var originalNav=window.nav;
  function radarNav(){
    if(typeof originalNav==='function')originalNav();
    var n=document.getElementById('nav');
    if(!n||n.querySelector('[data-radar-nav]'))return;
    var b=document.createElement('button');
    b.setAttribute('data-radar-nav','1');
    b.innerHTML='<span class="ico">RD</span>Radar de oportunidades';
    b.onclick=window.radarShow;
    n.appendChild(b);
  }
  window.nav=radarNav;
  function money(v){return (Number(v||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
  function esc2(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]})}
  function radarCard(o){
    var cls=o.classification||{};
    var color=Number(o.score)>=90?'live':Number(o.score)>=80?'live':'warn';
    return '<article class="card" style="display:grid;gap:11px">'+
      (o.image_url?'<img src="'+esc2(o.image_url)+'" alt="" style="width:100%;height:170px;object-fit:cover;border-radius:12px">':'')+
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span class="pill '+color+'">'+esc2(cls.label||'RADAR')+'</span><b style="font-size:24px">'+Number(o.score||0)+'/100</b></div>'+
      '<b>'+esc2(o.title)+'</b><div class="price">'+money(o.current_price)+(o.original_price?'<del class="muted"> '+money(o.original_price)+'</del>':'')+'</div>'+
      '<div class="muted">'+esc2((o.reasons||[]).join(' • ')||'Score provisório; histórico ainda insuficiente.')+'</div>'+
      '<div class="actions"><button class="btn" onclick="window.radarPublish(\\''+esc2(o.id)+'\\')">Enviar para fila</button></div></article>';
  }
  window.radarPublish=async function(id){
    try{var r=await fetch('/api/radar/autopilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'PUBLISH',offer_id:id})});var b=await r.json();if(!r.ok)throw Error(b.error||'Não foi possível publicar');if(typeof toast==='function')toast('Oferta enviada para a fila de publicação');window.radarShow()}catch(e){if(typeof toast==='function')toast(e.message);else alert(e.message)}
  };
  window.radarCreateRule=async function(){
    var name=document.getElementById('radarRuleName').value.trim()||'Regra Radar padrão';
    var score=Number(document.getElementById('radarRuleScore').value||80),discount=Number(document.getElementById('radarRuleDiscount').value||10);
    try{var r=await fetch('/api/radar/autopilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,min_score:score,min_discount:discount,require_price_history:false,status:'ACTIVE'})});var b=await r.json();if(!r.ok)throw Error(b.error||'Não foi possível criar a regra');if(typeof toast==='function')toast('Regra do Autopilot ativada');window.radarShow()}catch(e){if(typeof toast==='function')toast(e.message);else alert(e.message)}
  };
  window.radarRunAutopilot=async function(){
    try{var r=await fetch('/api/radar/autopilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'PUBLISH'})});var b=await r.json();if(!r.ok)throw Error(b.error||'Falha no Autopilot');if(typeof toast==='function')toast('Autopilot colocou '+Number(b.published||0)+' publicação(ões) na fila');window.radarShow()}catch(e){if(typeof toast==='function')toast(e.message);else alert(e.message)}
  };
  window.radarShow=async function(){
    current='radar';
    menu(false);
    document.getElementById('title').textContent='Radar de oportunidades';
    radarNav();
    var c=document.getElementById('content');
    c.innerHTML='<div class="hero"><div><div class="eyebrow" style="color:#61e7ba">RADAR INTELLIGENCE</div><h2>Encontre a oferta certa antes de publicar.</h2><p>O Radar combina preço atual, histórico, desconto, cupom e contexto do produto para pontuar cada oportunidade.</p><div class="actions"><button class="btn" onclick="window.radarRunAutopilot()">Rodar Autopilot</button><button class="btn secondary" onclick="show(\'offers\')">Ver ofertas</button></div></div><div class="pulsebox"><div class="pulse"><span>Motor de decisão</span><i class="dot"></i></div><strong>Radar Score</strong><small>35–100 · explicável por motivos</small></div></div><div id="radarArea" style="margin-top:22px"><div class="empty">Carregando oportunidades...</div></div>';
    try{
      var q=document.getElementById('radarMin').value||80;
    }catch(_){var q=80}
    try{
      var r=await fetch('/api/radar/opportunities?limit=30&minScore='+q),b=await r.json();
      if(!r.ok)throw Error(b.error||'Não foi possível carregar o Radar');
      var rules=await fetch('/api/radar/autopilot').then(function(x){return x.json()});
      var html='<div class="sectionhead"><div><h2>Oportunidades agora</h2><p>Priorize scores altos e envie somente o que faz sentido para seus grupos.</p></div><div class="toolbar"><select id="radarMin" class="input" onchange="window.radarShow()"><option value="0">Todos</option><option value="70">70+</option><option value="80" selected>80+</option><option value="90">90+</option></select></div></div>';
      html+='<div class="metrics">'+metric('Oportunidades',b.total||0,'encontradas pelo Radar')+metric('Score mínimo',q,'filtro atual')+metric('Regras Autopilot',(rules.rules||[]).length,'configuradas')+metric('Histórico','Ativo','preço por oferta')+'</div>';
      html+='<div class="grid three">'+((b.opportunities||[]).length?(b.opportunities||[]).map(radarCard).join(''):'<div class="empty">Nenhuma oportunidade acima do filtro.</div>')+'</div>';
      html+='<div class="sectionhead"><div><h2>Autopilot</h2><p>Crie uma regra simples e deixe o Radar colocar as melhores ofertas na fila.</p></div></div><div class="card"><div class="formgrid">'+field('Nome da regra','radarRuleName','text','value="Radar 80+"')+field('Score mínimo','radarRuleScore','number','min="0" max="100" value="80"')+'</div><div class="formgrid">'+field('Desconto mínimo (%)','radarRuleDiscount','number','min="0" max="100" value="10"')+'<div class="field"><label>Histórico de preço</label><div class="muted" style="padding:10px 0">Pode ser exigido quando sua base histórica estiver madura.</div></div></div><div class="actions"><button class="btn" onclick="window.radarCreateRule()">Ativar regra</button></div></div>';
      document.getElementById('radarArea').innerHTML=html;
    }catch(e){document.getElementById('radarArea').innerHTML='<div class="empty"><b>Radar indisponível</b><p>'+esc2(e.message)+'</p><button class="btn" onclick="window.radarShow()">Tentar novamente</button></div>'}
  };
  window.addEventListener('load',function(){setTimeout(function(){radarNav()},0)});
})();
</script>`;

export default async function handler(req, res) {
  if (!cachedHtml || process.env.NODE_ENV !== 'production') {
    const source = fs.readFileSync(htmlPath, 'utf8');
    cachedHtml = source.includes('</body>') ? source.replace('</body>', radarScript + '</body>') : source + radarScript;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(cachedHtml);
}
