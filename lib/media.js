import { httpsUrl } from './validation.js';
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
    response=await fetch(source,{signal:AbortSignal.timeout(60000),redirect:'manual'});
    if(![301,302,303,307,308].includes(response.status))break;
    const next=safePublicUrl(new URL(response.headers.get('location')||'',source).toString());
    if(!next||redirects===4)throw new Error('Redirecionamento de mídia inválido.');
    source=next;
  }
  if(!response.ok)throw new Error('Falha ao baixar a mídia concluída.');
  const type=String(response.headers.get('content-type')||'').split(';')[0];
  if(!['image/png','image/jpeg','image/webp','video/mp4'].includes(type))throw new Error('Formato de mídia não suportado.');
  if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw new Error('A mídia excede o limite permitido.');}
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new Error('A mídia excede o limite permitido.');}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
  return {data,type};
}
