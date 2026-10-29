chrome.storage.local.setAccessLevel({accessLevel:"TRUSTED_CONTEXTS"}).catch(()=>{});
const clean=(v,n=400)=>String(v??"").trim().slice(0,n);
const validUrl=value=>{try{return ["http:","https:"].includes(new URL(value).protocol)}catch{return false}};
async function store(offer,status="Salva localmente"){
 const {offers=[]}=await chrome.storage.local.get({offers:[]});
 const key=offer.productUrl||offer.sourceUrl||offer.affiliateUrl;
 const index=offers.findIndex(item=>key&&(item.productUrl||item.sourceUrl||item.affiliateUrl)===key);
 const saved={...offer,id:index>=0?offers[index].id:(offer.id||crypto.randomUUID()),savedAt:new Date().toISOString(),syncStatus:status};
 if(index>=0)offers[index]={...offers[index],...saved};else offers.unshift(saved);
 await chrome.storage.local.set({offers});return {ok:true,count:offers.length};
}
async function sendToApi(offer){
 const config=await chrome.storage.local.get({apiBase:"https://radar-promo-brasil.hatchable.site/api/extension-offers",apiToken:""});
 const endpoint=clean(config.apiBase,2000);
 let rawPrice=String(offer.price||"").replace(/[^\d,.-]/g,"");if(rawPrice.includes(",")&&rawPrice.includes("."))rawPrice=rawPrice.lastIndexOf(",")>rawPrice.lastIndexOf(".")?rawPrice.replace(/\./g,"").replace(",","."):rawPrice.replace(/,/g,"");else if(rawPrice.includes(","))rawPrice=rawPrice.replace(",",".");const price=Number(rawPrice);
 if(!endpoint.startsWith("https://")||!endpoint.endsWith("/api/extension-offers"))return {ok:false,status:"Configure o endpoint HTTPS oficial /api/extension-offers."};if(!config.apiToken)return {ok:false,status:"Token da extensão ausente. Gere-o no painel do Radar."};
 if(!offer.title||!validUrl(offer.affiliateUrl)||!validUrl(offer.imageUrl)||!Number.isFinite(price)||price<=0)return {ok:false,status:"Revisão necessária: título, preço, link afiliado e imagem são obrigatórios."};
 const sourceMap={"Mercado Livre":"MERCADO_LIVRE","Amazon":"AMAZON","SHEIN":"SHEIN","Magalu":"MAGALU","Temu":"TEMU","Outra":"Outro","Shopee":"SHOPEE","AliExpress":"ALIEXPRESS"};
 const payload={entity:"offer",title:offer.title,source:sourceMap[offer.platform]||offer.platform||"Outro",currentPrice:price,originalPrice:offer.originalPrice?Number(String(offer.originalPrice).replace(/[^\d,.-]/g,"").replace(",", ".")):null,imageUrl:offer.imageUrl,affiliateUrl:offer.affiliateUrl,productUrl:offer.productUrl||offer.sourceUrl,sourceCategory:offer.category||"",description:offer.notes||"",subId:offer.subId||"",message:"",storefrontVisible:false};
 const headers={"Content-Type":"application/json","Authorization":"Bearer "+config.apiToken};
 try{const response=await fetch(endpoint,{method:"POST",headers,credentials:"omit",body:JSON.stringify(payload)});const body=await response.text();let data;try{data=JSON.parse(body)}catch{data={message:body.slice(0,150)}};if(!response.ok)return {ok:false,status:response.status===409?"Oferta duplicada (409).":"API HTTP "+response.status+": "+clean(data.message||data.error,120)};return {ok:true,status:"API aceitou HTTP "+response.status+"; confirme a gravação no catálogo."};}
 catch(error){return {ok:false,status:"Falha de rede/CORS: "+clean(error.message,120)};}
}
async function copied(url,sourceTabId){
 if(!validUrl(url))return {ok:false,reason:"Link inválido."};
 const host=new URL(url).hostname.toLowerCase();
 const supported=/(mercadolivre|mercadolibre|meli\.la|amazon|amzn\.to|a\.co|shopee|shope\.ee|aliexpress|temu|shein|magalu|magazineluiza)/.test(host);
 if(!supported)return {ok:false,reason:"O domínio copiado não é um marketplace compatível."};
 const config=await chrome.storage.local.get({copyCaptureEnabled:true,autoOpenOnCopy:true,captureMode:"assisted"});
 if(!config.copyCaptureEnabled)return {ok:false,reason:"Captura por cópia desativada."};
 const {lastCopy={}}=await chrome.storage.session.get({lastCopy:{}});
 if(lastCopy.url===url&&Date.now()-lastCopy.at<10000)return {ok:true,duplicate:true};
 await chrome.storage.session.set({lastCopy:{url,at:Date.now()}});
 await chrome.storage.local.set({lastCopiedAffiliateUrl:url});
 if(!config.autoOpenOnCopy)return {ok:true,opened:false};
 const tab=await chrome.tabs.create({url,active:false});
 await chrome.storage.session.set({["pending_"+tab.id]:{affiliateUrl:url,sourceTabId,mode:config.captureMode}});
 return {ok:true,opened:true};
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type==="RADAR_COPIED_LINK"){
  const match=String(message.text||message.url||"").match(/https?:\/\/[^\s<>"']+/i);
  const url=match?.[0]?.replace(/[),.;\]}]+$/,"")||"";
  copied(url,message.sourceTabId||sender.tab?.id||null).then(reply).catch(e=>reply({ok:false,reason:clean(e.message)}));return true;
 }
 if(message?.type==="RADAR_AUTO_CAPTURE_RESULT"){
  (async()=>{
   const tabId=sender.tab?.id,data=tabId?await chrome.storage.session.get("pending_"+tabId):{},job=tabId?data["pending_"+tabId]:null;
   if(tabId)await chrome.storage.session.remove("pending_"+tabId);
   const offer={...message.offer,affiliateUrl:job?.affiliateUrl||message.offer?.affiliateUrl||"",copiedAffiliateUrl:job?.affiliateUrl||""};
   let status=job?.mode==="assisted"?"Capturada — revise antes de enviar":"Capturada automaticamente — salva localmente";
   if(job?.mode==="intelligent"){
    const settings=await chrome.storage.local.get({autoSendOnCapture:false});
    if(settings.autoSendOnCapture){const sent=await sendToApi(offer);status=sent.status;}
   }
   const result=await store(offer,status);reply({ok:true,...result,status});
  })().catch(e=>reply({ok:false,reason:clean(e.message)}));return true;
 }
 if(message?.type==="SAVE_OFFER"){store(message.offer||{}).then(reply);return true;}
 if(message?.type==="GET_OFFERS"){chrome.storage.local.get({offers:[]},d=>reply({offers:d.offers||[]}));return true;}
 if(message?.type==="DELETE_OFFER"){chrome.storage.local.get({offers:[]},d=>{const offers=(d.offers||[]).filter(x=>x.id!==message.id);chrome.storage.local.set({offers},()=>reply({ok:true,offers}));});return true;}
});
chrome.tabs.onUpdated.addListener(async(tabId,info)=>{
 if(info.status!=="complete")return;
 const data=await chrome.storage.session.get("pending_"+tabId);
 if(!data["pending_"+tabId])return;
 setTimeout(()=>chrome.tabs.sendMessage(tabId,{type:"RADAR_AUTO_CAPTURE"}).catch(()=>{}),800);
});
chrome.tabs.onRemoved.addListener(id=>chrome.storage.session.remove("pending_"+id));