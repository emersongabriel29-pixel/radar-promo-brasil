import {db,config} from 'hatchable';
import {httpsUrl} from './validation.js';
import {fetchPinnedHttps} from './network-guard.js';
import {meliGet} from './direct-connectors.js';
import {ingestOffers} from './ingestion.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function meliItemId(value){
  const safe=httpsUrl(value);if(!safe)return '';
  const url=new URL(safe);if(!/(^|\.)mercadolivre\.com\.br$/.test(url.hostname))return '';
  const id=url.pathname.match(/\b(MLB)-?(\d{6,18})\b/i);return id?('MLB'+id[2]):'';
}
export async function canActivateMonitor(accountId,id){
  const row=(await db.query('SELECT * FROM monitors WHERE id=$1 AND account_id=$2',[id,accountId])).rows[0];
  if(!row||row.status==='ARCHIVED')throw fail('Monitor não encontrado.',404);
  if(!row.source_authorized)throw fail('Confirme a autorização da origem ao cadastrar este monitor.',412);
  if(row.source_type==='FEED')return true;
  if(row.source_type==='MARKETPLACE'){
    if(!meliItemId(row.source_url)||!httpsUrl(row.affiliate_url))throw fail('Use o anúncio do Mercado Livre e seu link oficial de afiliado para este produto.',412);
    if(!(await db.query("SELECT id FROM marketplace_connections WHERE account_id=$1 AND marketplace='MERCADOLIVRE' AND status='ACTIVE'",[accountId])).rows.length)throw fail('Conecte o Mercado Livre antes de ativar esta origem.',412);
    return true;
  }
  if(['WHATSAPP_GROUP','TELEGRAM_CHANNEL'].includes(row.source_type)){
    let ready=false;try{ready=Boolean(await config.get('N8N_WEBHOOK_SECRET'));}catch{}
    if(!ready)throw fail('Configure a ponte segura n8n para receber eventos desta origem autorizada.',412);
    return true;
  }
  throw fail('Use feed JSON, anúncio do Mercado Livre ou eventos autorizados do conector. Leitura genérica de sites não está habilitada.',412);
}
async function beforeDeadline(promise,deadline,onTimeout){
  const remaining=deadline-Date.now();
  if(remaining<=0){onTimeout?.();throw fail('Tempo limite absoluto ao consultar o feed.',408);}
  let timer;
  try{
    return await Promise.race([
      promise,
      new Promise((_,reject)=>{timer=setTimeout(()=>{onTimeout?.();reject(fail('Tempo limite absoluto ao consultar o feed.',408));},remaining);})
    ]);
  }finally{clearTimeout(timer);}
}
export async function fetchOfferFeed(value,{request=fetchPinnedHttps,timeout=8000}={}){
  let url=httpsUrl(value);if(!url)throw fail('Origem HTTPS inválida.');
  if(!Number.isFinite(timeout)||timeout<=0)throw fail('Tempo limite inválido.');
  const deadline=Date.now()+timeout;
  let response;
  for(let n=0;n<=3;n++){
    try{
      response=await beforeDeadline(request(url,{timeout:Math.max(1,deadline-Date.now())}),deadline,()=>{try{response?.body?.cancel();}catch{}});
    }catch(error){if(error.status===408)throw error;throw fail('Origem HTTPS inválida.');}
    if(![301,302,303,307,308].includes(response.status))break;
    const next=httpsUrl(new URL(response.headers.get('location')||'',url).toString());
    if(!next||n===3){try{await response.body?.cancel();}catch{}throw fail('Redirecionamento de origem inválido.');}
    try{await response.body?.cancel();}catch{}
    url=next;
  }
  if(!response.ok||!/^application\/(json|[^;]+\+json)(;|$)/i.test(response.headers.get('content-type')||'')){try{await response.body?.cancel();}catch{}throw fail('A origem deve responder com um feed JSON autorizado.');}
  const max=1024*1024;
  if(Number(response.headers.get('content-length'))>max){try{await response.body?.cancel();}catch{}throw fail('Feed acima de 1 MiB.');}
  const reader=response.body.getReader(),chunks=[];let total=0;
  try{
    while(true){
      const {done,value}=await beforeDeadline(reader.read(),deadline,()=>{void reader.cancel().catch(()=>{});});
      if(done)break;
      total+=value.byteLength;
      if(total>max){await reader.cancel();throw fail('Feed acima de 1 MiB.');}
      chunks.push(value);
    }
  }catch(error){try{await reader.cancel(error);}catch{}throw error;}
  const data=new Uint8Array(total);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.byteLength;}
  let parsed;try{parsed=JSON.parse(new TextDecoder().decode(data));}catch{throw fail('JSON da origem inválido.');}
  const offers=Array.isArray(parsed)?parsed:parsed?.offers;if(!Array.isArray(offers))throw fail('O feed precisa conter uma lista offers.');return offers.slice(0,50);
}
export async function runMonitors({accountId=null,monitorId=null,manual=false,fetchFeed=fetchOfferFeed}={}){
  const rows=(await db.query("SELECT m.* FROM monitors m JOIN accounts a ON a.id=m.account_id WHERE m.status='ACTIVE' AND a.status='ACTIVE' AND m.source_authorized AND m.source_type IN ('FEED','MARKETPLACE') AND ($1::text IS NULL OR m.account_id=$1) AND ($2::text IS NULL OR m.id=$2) AND (m.last_run_at IS NULL OR m.last_run_at<now()-($3::text||' seconds')::interval) ORDER BY m.last_run_at NULLS FIRST LIMIT 2",[accountId,monitorId,manual?60:3600])).rows;
  let captured=0,failed=0;
  for(const row of rows){
    const claimed=await db.query("UPDATE monitors SET last_run_at=now() WHERE id=$1 AND account_id=$2 AND status='ACTIVE' AND (last_run_at IS NULL OR last_run_at<now()-($3::text||' seconds')::interval) RETURNING id",[row.id,row.account_id,manual?60:3600]);
    if(!claimed.rows.length)continue;
    try{
      let offers;
      if(row.source_type==='FEED')offers=await fetchFeed(row.source_url);
      else{
        const id=meliItemId(row.source_url);if(!id||!httpsUrl(row.affiliate_url))throw fail('Confira anúncio e link de afiliado.');
        const result=await meliGet(row.account_id,'/items/'+id);
        if(result.status!==200)throw fail('O Mercado Livre não autorizou ou não concluiu a consulta deste anúncio.');
        const item=result.body;
        offers=item.status==='active'&&Number(item.available_quantity)>0?[{title:item.title,source:'MERCADO_LIVRE',currentPrice:item.price,originalPrice:item.original_price,productUrl:item.permalink||row.source_url,affiliateUrl:row.affiliate_url,imageUrl:(item.pictures?.[0]?.secure_url||item.secure_thumbnail||'').replace(/^http:/,'https:'),externalId:item.id}]:[];
      }
      const result=await ingestOffers({offers},'monitor:'+row.id+':'+crypto.randomUUID(),row.account_id,{monitor:row,importedBy:'MONITOR',reviewOnly:row.source_type==='MARKETPLACE'});captured+=result.inserted;
      await db.query("UPDATE monitors SET last_error='' WHERE id=$1 AND account_id=$2",[row.id,row.account_id]);
    }catch(e){failed++;await db.query('UPDATE monitors SET last_error=$3 WHERE id=$1 AND account_id=$2',[row.id,row.account_id,e.status?e.message:'Falha na origem; o monitor tentará novamente na próxima janela.']);}
  }
  return {checked:rows.length,captured,failed};
}
