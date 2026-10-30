(() => {
  const $ = id => document.getElementById(id);
  const clean = v => String(v || "").replace(/\s+/g, " ").trim();
  const couponSources = ["promobit.com.br","pelando.com.br","cuponomia.com.br","melhorescupons.com.br","cupom.org","méliuz.com.br","melhoresdestinos.com.br"];
  const statusText = (s, t) => { if ($("status")) $("status").textContent = s; if ($("couponStatus")) $("couponStatus").textContent = t || s; };
  const currentTitle = () => clean($("title")?.value);
  const currentStore = () => clean($("platform")?.value);
  const searchUrl = q => "https://www.google.com/search?q=" + encodeURIComponent(q) + "&num=10";
  const unwrap = href => { try { const u = new URL(href, "https://www.google.com"); return u.hostname.includes("google.") && u.pathname === "/url" ? (u.searchParams.get("q") || u.searchParams.get("url") || href) : u.href; } catch { return ""; } };
  function searchLinks(html) {
    const doc = new DOMParser().parseFromString(html, "text/html"), seen = new Set(), links = [];
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = unwrap(a.getAttribute("href") || ""), text = clean(a.innerText || a.textContent);
      try {
        const u = new URL(href);
        if (couponSources.some(d => u.hostname === d || u.hostname.endsWith("." + d)) && !seen.has(u.href) && text.length > 2) {
          seen.add(u.href); links.push({url:u.href,title:text.slice(0,180)});
        }
      } catch {}
    }
    return links.slice(0,8);
  }
  function getText(doc) { return clean(doc.body?.innerText || doc.body?.textContent || "").slice(0,180000); }
  function extractCoupons(html, source) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = getText(doc), candidates = [];
    const add = (code, context) => {
      code = clean(code).replace(/^[^A-Z0-9]+|[^A-Z0-9_-]+$/gi,"").toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{3,19}$/.test(code)) return;
      if (/^(CUPOM|CODIGO|DESCONTO|PROMOCAO|PROMO|VALIDO|ATIVO|OFFICIAL|HTTPS|HTTP|BRASIL|AMAZON|SHEIN|MAGALU|MERCADOLIVRE|CUPONS)$/.test(code)) return;
      if (!candidates.some(c => c.code === code)) candidates.push({code,context:clean(context).slice(0,260)});
    };
    for (const el of doc.querySelectorAll("[data-code],[data-coupon-code],[data-coupon],[class*='coupon-code' i],[class*='cupom-code' i],[class*='couponCode' i],code")) {
      const code = el.getAttribute("data-coupon-code") || el.getAttribute("data-code") || el.getAttribute("data-coupon") || el.innerText || el.textContent;
      add(code, el.parentElement?.innerText || el.parentElement?.textContent || el.innerText || "");
    }
    const patterns = [
      /(?:cupom|c[oó]digo(?: promocional)?|use o c[oó]digo|insira o c[oó]digo|aplique o c[oó]digo)[^A-Z0-9]{0,65}([A-Z0-9][A-Z0-9_-]{3,19})/gi,
      /(?:c[oó]digo|cupom)\s*[:：-]\s*([A-Z0-9][A-Z0-9_-]{3,19})/gi
    ];
    for (const re of patterns) { let m, guard=0; while ((m=re.exec(text)) && guard++<40) add(m[1],text.slice(Math.max(0,m.index-100),Math.min(text.length,m.index+220))); }
    return candidates.slice(0,12).map(c => {
      const context = c.context || "";
      const expiryMatch = context.match(/(?:v[aá]lido\s+at[eé]|expira\s+em|expira[cç][aã]o|validade\s*:?)\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
      let expiry = "";
      if (expiryMatch) {
        const raw=expiryMatch[1]; let d;
        if (/^\d{4}-/.test(raw)) d=new Date(raw+"T23:59:59");
        else { const p=raw.split(/[\/.-]/).map(Number); let y=p[2]; if(y<100)y+=2000; d=new Date(y,p[1]-1,p[0],23,59,59); }
        if (!Number.isNaN(d.getTime())) expiry=d.toISOString().slice(0,10);
      }
      const past=expiry && new Date(expiry+"T23:59:59") < new Date();
      const explicitExpired=/cupom\s+(?:expirado|vencido)|(?:expirado|vencido)\s+(?:em|desde)|n[aã]o\s+est[aá]\s+mais\s+v[aá]lido/i.test(context);
      const explicitActive=/(?:cupom|c[oó]digo).{0,40}(?:ativo|v[aá]lido|funcionando)|(?:ativo|v[aá]lido).{0,30}(?:cupom|c[oó]digo)/i.test(context);
      const discountMatch=context.match(/(?:at[eé]|desconto de|economize|off)\s*(\d{1,2}\s?%|R\$\s?\d[\d.,]*)/i);
      const expired=Boolean(past||explicitExpired), active=Boolean(explicitActive&&!expired);
      return {code:c.code,source,context,expiry,discount:discountMatch?clean(discountMatch[1]):"",status:expired?"EXPIRADO":active?"FONTE DECLARA ATIVO":"NÃO CONFIRMADO",productUrl:clean($("productUrl")?.value),validation:"PENDENTE",evidence:past?"Data de validade encontrada e vencida.":explicitExpired?"O trecho associado ao código informa que expirou.":active?"O trecho associado ao código descreve-o como ativo; não houve teste no carrinho.":"Código encontrado na página, sem evidência suficiente de validade."};
    });
  }
  async function fetchText(url) {
    const res = await fetch(url,{credentials:"omit",redirect:"follow",cache:"no-store"});
    if (!res.ok) throw new Error("HTTP "+res.status);
    return await res.text();
  }
  async function searchCouponCodes() {
    const title=currentTitle(), store=currentStore();
    if (!title) { statusText("Capture um produto ou informe seu nome antes de buscar cupons."); return; }
    const panel=$("couponResults"); if(panel) panel.innerHTML="<p>Pesquisando fontes públicas e extraindo códigos…</p>";
    statusText("Pesquisando cupons para "+title+"…");
    const query='"'+title+'" '+store+' cupom código desconto site:promobit.com.br OR site:pelando.com.br OR site:cuponomia.com.br OR site:melhorescupons.com.br OR site:cupom.org';
    try {
      const searchHtml=await fetchText(searchUrl(query));
      const links=searchLinks(searchHtml);
      if(!links.length) {
        if(panel) panel.innerHTML="<p>O mecanismo de busca não retornou páginas de cupons acessíveis. Tente novamente ou abra a busca web.</p>";
        statusText("Nenhuma fonte de cupom foi acessada. Isso não significa que não existam cupons.");
        return;
      }
      const settled=await Promise.allSettled(links.map(async link=>({link,coupons:extractCoupons(await fetchText(link.url),link.title+" — "+new URL(link.url).hostname)})));
      const all=[];
      for(const result of settled) if(result.status==="fulfilled") all.push(...result.value.coupons);
      const stored=await chrome.storage.local.get({couponResults:[]});
      const previous=stored.couponResults||[];
      const unique=[...new Map(all.map(c=>{const old=previous.find(x=>x.code===c.code&&x.source===c.source);return [c.code+"|"+c.source,old&&old.validation&&old.validation!=="PENDENTE"?{...c,validation:old.validation,status:old.status}:c];})).values()].slice(0,30);
      const merged=[...unique,...previous].filter((c,i,a)=>a.findIndex(x=>x.code===c.code&&x.source===c.source)===i).slice(0,100);
      await chrome.storage.local.set({couponResults:merged});
      renderCouponResults(unique);
      const active=unique.filter(c=>c.status==="FONTE DECLARA ATIVO").length;
      const expired=unique.filter(c=>c.status==="EXPIRADO").length;
      statusText("Busca concluída: "+unique.length+" códigos extraídos; "+active+" descritos como ativos pela fonte; "+expired+" expirados. Nenhum foi testado no carrinho.");
    } catch(e) {
      if(panel) panel.innerHTML="<p>Falha ao consultar as fontes automaticamente. Algumas páginas bloqueiam acessos feitos por extensões.</p>";
      statusText("Falha na busca de cupons: "+String(e.message||e));
    }
  }
  function renderCouponResults(items) {
    const panel=$("couponResults"); if(!panel) return;
    if(!items.length){panel.innerHTML="<p>Nenhum código extraível foi encontrado nas páginas consultadas. Pode haver cupons sem código ou conteúdo carregado por scripts.</p>";return;}
    panel.innerHTML=items.map((c,i)=>'<article class="couponItem"><div class="couponTop"><strong>'+escapeHtml(c.code)+'</strong><span class="couponStatus '+(c.status==="EXPIRADO"?"expired":c.status==="FONTE DECLARA ATIVO"?"sourceActive":"unknown")+'">'+escapeHtml(c.status)+'</span></div><small>'+escapeHtml(c.source)+'</small>'+(c.discount?'<p>Desconto encontrado: '+escapeHtml(c.discount)+'</p>':'')+(c.expiry?'<p>Validade identificada: '+escapeHtml(c.expiry)+'</p>':'')+'<p>'+escapeHtml(c.evidence)+'</p><p><strong>Teste no carrinho:</strong> '+escapeHtml(c.validation||"PENDENTE")+'</p><button type="button" data-copy-coupon="'+i+'">Copiar código</button><button type="button" data-test-coupon="'+i+'">Abrir produto para testar</button><div class="couponValidationActions"><button type="button" data-validation="APROVADO" data-index="'+i+'">Funcionou no carrinho</button><button type="button" data-validation="REJEITADO" data-index="'+i+'">Loja recusou</button></div></article>').join("");
    panel.querySelectorAll("[data-copy-coupon]").forEach(btn=>btn.addEventListener("click",async()=>{const c=items[Number(btn.dataset.copyCoupon)];try{await navigator.clipboard.writeText(c.code);statusText("Código "+c.code+" copiado. Confirme no carrinho da loja.");}catch{statusText("Não foi possível copiar o código.");}}));
    panel.querySelectorAll("[data-test-coupon]").forEach(btn=>btn.addEventListener("click",async()=>{const c=items[Number(btn.dataset.testCoupon)];try{await navigator.clipboard.writeText(c.code);}catch{} const url=c.productUrl||$("productUrl")?.value; if(!url){statusText("Informe a URL do produto antes de iniciar o teste.");return;} try{await chrome.tabs.create({url,active:true});statusText("Produto aberto. Aplique "+c.code+" no carrinho e registre o resultado aqui.");}catch{statusText("Não foi possível abrir o produto para testar o cupom.");}}));
    panel.querySelectorAll("[data-validation]").forEach(btn=>btn.addEventListener("click",async()=>{const c=items[Number(btn.dataset.index)];c.validation=btn.dataset.validation==="APROVADO"?"VALIDADO NO CARRINHO PELO USUÁRIO":"REJEITADO NO CARRINHO PELO USUÁRIO";c.status=c.validation;const saved=await chrome.storage.local.get({couponResults:[]});const all=[...items,...(saved.couponResults||[])].filter((x,i,a)=>a.findIndex(y=>y.code===x.code&&y.source===x.source)===i);await chrome.storage.local.set({couponResults:all.slice(0,100)});renderCouponResults(items);statusText("Resultado registrado: "+c.code+" — "+c.validation+".");}));
  }
  function escapeHtml(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  document.addEventListener("DOMContentLoaded",()=>{const b=$("searchCoupons"); if(b)b.onclick=searchCouponCodes;});
  const b=$("searchCoupons"); if(b)b.onclick=searchCouponCodes;
})();