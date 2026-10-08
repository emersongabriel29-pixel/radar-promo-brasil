import https from 'node:https';
import { httpsUrl } from './validation.js';
import { resolvePublicHost } from './network-guard.js';
export const clean=(value,max=1000)=>String(value??'').trim().slice(0,max);

export function mediaRatio(value,kind='IMAGE'){
  const image={'1:1':'1:1','4:5':'3:4','3:4':'3:4','4:3':'4:3','9:16':'9:16','16:9':'16:9','21:9':'21:9'};
  const video={'16:9':'1280:720','9:16':'720:1280'};
  return (kind==='VIDEO'?video:image)[clean(value,12)]||(kind==='VIDEO'?'720:1280':'1:1');
}

export function isRateLimit(error){
  const message=String(error?.message||'');
  return error?.status===429||error?.code==='ai_spend_limit_reached'||/\b429\b|rate.?limit|credit.*used|too many requests/i.test(message);
}

export function isSetupRequired(error){
  return ['SetupRequired','SETUP_REQUIRED'].includes(error?.code)||/no .*?(api )?key|setup gate|Builder \+ AI|not connected|não configurad|not configured/i.test(String(error?.message||''));
}

export function safePublicUrl(value){
  return httpsUrl(value);
}

export async function downloadMedia(url,{maxBytes=64*1024*1024}={}) {
  let source=safePublicUrl(url);
  if(!source)throw new Error('URL de mídia inválida.');
  let response;
  for(let redirects=0;redirects<=4;redirects++){
    const pinned=await resolvePublicHost(source);
    response=await new Promise((resolve,reject)=>{
      const request=https.request(source,{method:'GET',lookup:(_hostname,options,callback)=>{if(typeof options==='function')callback=options;callback(null,pinned.address,pinned.family);},headers:{accept:'*/*'}},resolve);
      request.setTimeout(60000,()=>request.destroy(new Error('Tempo limite ao baixar a mídia.')));
      request.on('error',reject);
      request.end();
    });
    if(![301,302,303,307,308].includes(response.statusCode))break;
    response.resume();
    const next=safePublicUrl(new URL(response.headers.location||'',source).toString());
    if(!next||redirects===4)throw new Error('Redirecionamento de mídia inválido.');
    source=next;
  }
  if(response.statusCode<200||response.statusCode>=300)throw new Error('Falha ao baixar a mídia concluída.');
  const type=String(response.headers['content-type']||'').split(';')[0];
  if(!['image/png','image/jpeg','image/webp','video/mp4'].includes(type)){response.resume();throw new Error('Formato de mídia não suportado.');}
  if(Number(response.headers['content-length'])>maxBytes){response.resume();throw new Error('A mídia excede o limite permitido.');}
  const chunks=[];let size=0;
  for await(const chunk of response){
    size+=chunk.length;
    if(size>maxBytes){response.destroy();throw new Error('A mídia excede o limite permitido.');}
    chunks.push(chunk);
  }
  return {data:Buffer.concat(chunks,size),type};
}
