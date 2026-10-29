const $=id=>document.getElementById(id),val=id=>$(id).value.trim(),set=(id,v)=>$(id).value=v||"",msg=t=>$("status").textContent=t;
const send=m=>new Promise((resolve,reject)=>chrome.runtime.sendMessage(m,r=>chrome.runtime.lastError?reject(chrome.runtime.lastError):resolve(r)));
let captured={},generatedAffiliate="";
const validHttps=v=>{try{return new URL(v).protocol==="https:"}catch{return false}};
function num(v){if(typeof v==="number")return v;let s=String(v||"").replace(/[^\d,.-]/g,"");if(s.includes(",")&&s.includes("."))s=s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");else if(s.includes(","))s=s.replace(",",".");let n=Number(s);return Number.isFinite(n)?n:null}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function makeAffiliateLink(productUrl,template,subId){
 if(!template||!template.includes("{url}"))return "";
 try{const result=template.replaceAll("{url}",encodeURIComponent(productUrl)).replaceAll("{subId}",encodeURIComponent(subId||""));return validHttps(result)?result:""}catch{return ""}
}
function fillAffiliate(){
 const current=val("affiliateUrl");
 const mayReplace=!current||current===generatedAffiliate;
 if(!mayReplace&&validHttps(current))return;
 const generated=makeAffiliateLink(val("productUrl"),val("affiliateTemplate"),val("subId"));
 if(generated){generatedAffiliate=generated;set("affiliateUrl",generated);$("affiliateHint").textContent="Link preenchido pelo modelo configurado. Confirme se o modelo é válido para seu programa de afiliados.";return}
 generatedAffiliate="";
 if(captured.affiliateUrl&&validHttps(captured.affiliateUrl)){set("affiliateUrl",captured.affiliateUrl);$("affiliateHint").textContent="Link rastreado detectado na URL da página.";return}
 if(mayReplace)set("affiliateUrl","");
 $("affiliateHint").textContent="Nenhum link rastreado detectado. Configure um modelo oficial ou cole seu link de afiliado.";
}
async function init(){
 const c=await chrome.storage.local.get({apiBase:"",apiToken:"",defaultSubId:"",affiliateTemplate:""});
 for(const k of ["apiBase","apiToken","defaultSubId","affiliateTemplate"])set(k,c[k]);
 await refresh();
}
async function capture(){
 const [t]=await chrome.tabs.query({active:true,currentWindow:true});
 if(!t?.id||!/^https?:/.test(t.url||""))return msg("Abra uma página de produto compatível.");
 try{
  const r=await chrome.tabs.sendMessage(t.id,{type:"RADAR_CAPTURE"});
  if(!r?.ok)throw Error();
  captured=r.offer;
  generatedAffiliate="";
  ["platform","title","price","originalPrice","productUrl","imageUrl","category"].forEach(k=>set(k,captured[k]||(k==="productUrl"?captured.sourceUrl:"")));
  set("subId",captured.subId||val("defaultSubId"));
  set("affiliateUrl",captured.affiliateUrl||"");
  fillAffiliate();
  msg("Captura concluída. Categoria, Sub_id e link rastreado foram preenchidos quando encontrados.");
 }catch{msg("Captura indisponível nesta página. Atualize a aba e tente novamente.")}
}
function couponSearchQuery(){
 const title=val("title")||captured.title||"";
 const store=val("platform")||captured.platform||"";
 const terms=[title,store,"cupom OR cupons OR desconto OR código promocional"].filter(Boolean).join(" ");
 const sites="(site:promobit.com.br OR site:pelando.com.br OR site:cuponomia.com.br OR site:melhorescupons.com.br OR site:cupom.org)";
 return "https://www.google.com/search?q="+encodeURIComponent(terms+" "+sites);
}
async function searchCoupons(){
 const title=val("title")||captured.title;
 if(!title){msg("Capture uma página de produto ou informe o nome do produto antes de buscar cupons.");return;}
 const query=couponSearchQuery();
 try{
  await chrome.tabs.create({url:query,active:true});
  msg("Busca de cupons aberta para "+(val("platform")||captured.platform||"a loja")+". Confira validade, regras e valor mínimo antes de usar.");
 }catch(err){msg("Não foi possível abrir a busca de cupons: "+String(err));}
}
function offer(){return{...captured,platform:val("platform"),title:val("title"),price:val("price"),originalPrice:val("originalPrice"),productUrl:val("productUrl"),affiliateUrl:val("affiliateUrl"),imageUrl:val("imageUrl"),subId:val("subId"),category:val("category"),notes:val("notes"),reviewed:true}}
async function refresh(){
 const {offers=[]}=await send({type:"GET_OFFERS"});
 $("count").textContent=offers.length;
 $("offers").innerHTML=offers.slice(0,15).map(o=>'<div class="item"><strong>'+esc(o.title)+'</strong><small>'+esc(o.platform)+' · '+esc(o.price)+'<br>'+esc(o.syncStatus||"Salva localmente")+'<br>'+esc(o.productUrl)+'</small></div>').join("")||"<p>Nenhuma oferta.</p>";
}
$("capture").onclick=capture;
$("searchCoupons").onclick=searchCoupons;
["productUrl","subId","affiliateTemplate"].forEach(id=>$(id).addEventListener("change",fillAffiliate));
$("saveConfig").onclick=async()=>{
 const base=val("apiBase"),template=val("affiliateTemplate");
 if(base&&!validHttps(base))return msg("O endpoint deve usar HTTPS.");
 if(template&&(!validHttps(template)||!template.includes("{url}")))return msg("O modelo deve ser HTTPS e conter o marcador {url}.");
 await chrome.storage.local.set({apiBase:base.replace(/\/$/,""),apiToken:val("apiToken"),defaultSubId:val("defaultSubId"),affiliateTemplate:template});
 if(!val("subId"))set("subId",val("defaultSubId"));
 fillAffiliate();
 msg("Configurações salvas. O modelo precisa ser compatível com seu programa de afiliados.");
};
$("form").onsubmit=async e=>{
 e.preventDefault();
 fillAffiliate();
 const o=offer(),base=val("apiBase").replace(/\/$/,""),token=val("apiToken"),price=num(o.price);
 if(!o.title||!o.productUrl)return msg("Informe nome e URL do produto.");
 if(!validHttps(o.affiliateUrl))return msg("Não foi possível confirmar um link de afiliado HTTPS. Configure um modelo válido ou informe o link correto.");
 if(!validHttps(o.imageUrl))return msg("Informe uma imagem HTTPS.");
 if(price===null||price<=0)return msg("Informe um preço válido.");
 if(!validHttps(base))return msg("Configure o endpoint HTTPS real da API.");
 await chrome.storage.local.set({apiBase:base,apiToken:token,defaultSubId:val("defaultSubId"),affiliateTemplate:val("affiliateTemplate")});
 msg("Enviando à API...");
 const sourceMap={"Mercado Livre":"MERCADO_LIVRE","Amazon":"AMAZON","SHEIN":"SHEIN","Magalu":"MAGALU","Temu":"TEMU","Outra":"Outro"};
  const payload={entity:"offer",title:o.title,source:sourceMap[o.platform]||o.platform||"Outro",currentPrice:price,originalPrice:num(o.originalPrice),imageUrl:o.imageUrl,affiliateUrl:o.affiliateUrl,productUrl:o.productUrl,sourceCategory:o.category||"",description:o.notes||"",subId:o.subId||"",message:"",storefrontVisible:false};
 try{
  const h={"Content-Type":"application/json"};if(token)h.Authorization="Bearer "+token;
  const res=await fetch(base,{method:"POST",headers:h,credentials:"omit",body:JSON.stringify(payload)});
  const raw=await res.text();let data;try{data=JSON.parse(raw)}catch{data={message:raw.slice(0,180)}}
  if(!res.ok){
   const why=res.status===409?"Oferta duplicada (409).":res.status===401||res.status===403?"Autenticação recusada ("+res.status+").":"API respondeu HTTP "+res.status+". "+(data.message||data.error||"");
   await send({type:"SAVE_OFFER",offer:{...o,syncStatus:"Falha: "+why}});msg(why);await refresh();return;
  }
  await send({type:"SAVE_OFFER",offer:{...o,syncStatus:"API respondeu HTTP "+res.status,serverResponse:data}});
  msg("API respondeu HTTP "+res.status+". Confirme o catálogo para validar a gravação.");await refresh();
 }catch(err){
  await send({type:"SAVE_OFFER",offer:{...o,syncStatus:"Erro de rede/CORS: "+String(err)}});
  msg("Falha de rede/CORS. Confirme endpoint, CORS e autenticação.");await refresh();
 }
};
$("export").onclick=async()=>{
 const {offers=[]}=await send({type:"GET_OFFERS"}),u=URL.createObjectURL(new Blob([JSON.stringify(offers,null,2)],{type:"application/json"})),a=document.createElement("a");
 a.href=u;a.download="radar-ofertas.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
$("copy").onclick=async()=>{
 const {offers=[]}=await send({type:"GET_OFFERS"});if(!offers.length)return msg("Nenhuma oferta salva.");
 const o=offers[0];await navigator.clipboard.writeText("*"+o.title+"*\n"+(o.price||"")+"\n"+(o.affiliateUrl||o.productUrl));msg("Mensagem copiada; revise o link.");
};
init();