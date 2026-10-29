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
async function copied(url,sourceTabId){
 if(!validUrl(url))return {ok:false,reason:"Link inválido."};
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
  copied(url,message.sourceTabId||sender.tab?.id||null).then(reply).catch(e=>reply({ok:false,reason:clean(e.message)}));
  return true;
 }
 if(message?.type==="RADAR_AUTO_CAPTURE_RESULT"){
  (async()=>{
   const tabId=sender.tab?.id;
   const data=tabId?await chrome.storage.session.get("pending_"+tabId):{};
   const job=tabId?data["pending_"+tabId]:null;
   if(tabId)await chrome.storage.session.remove("pending_"+tabId);
   const offer={...message.offer,affiliateUrl:job?.affiliateUrl||message.offer?.affiliateUrl||"",copiedAffiliateUrl:job?.affiliateUrl||""};
   const status=job?.mode==="assisted"?"Capturada — revise antes de enviar":"Capturada automaticamente — salva localmente";
   const result=await store(offer,status);
   reply({ok:true,...result,status});
  })().catch(e=>reply({ok:false,reason:clean(e.message)}));
  return true;
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