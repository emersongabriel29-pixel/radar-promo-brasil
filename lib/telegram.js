import { config } from 'hatchable';
import { validBotToken,buildTelegramCaption } from 'lib/telegram-core.js';
import { credentialBelongs } from 'lib/credential-bindings.js';

export async function configuredBotToken(slot=1,accountId=''){
  if(accountId&&!(await credentialBelongs('TELEGRAM',slot,accountId)))throw new Error('Credencial do bot não pertence a esta conta.');
  let token='';
  try{token=await config.get('TELEGRAM_BOT_TOKEN_'+Math.max(1,Math.min(3,Number(slot)||1)))}catch{}
  if(!validBotToken(token))throw new Error('Configure o token deste bot nos segredos seguros do projeto.');
  return token;
}

export async function telegramCall(token,method,payload){
  let response,data;
  try{response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});data=await response.json()}
  catch{throw Object.assign(new Error('O Telegram não confirmou a operação. Verifique o destino antes de tentar novamente.'),{code:method.startsWith('send')?'DELIVERY_UNCONFIRMED':'TELEGRAM_UNAVAILABLE'})}
  if(!response.ok||!data.ok)throw new Error(String(data.description||'Falha na API do Telegram').slice(0,300));
  return data.result;
}

export async function inspectBot(token){
  if(!validBotToken(token))throw new Error('Token do bot inválido.');
  return telegramCall(token,'getMe',{});
}

export function telegramHtml(value=''){
  return String(value||'').slice(0,4000).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*([^*\n]+)\*/g,'<b>$1</b>')
    .replace(/~([^~\n]+)~/g,'<s>$1</s>');
}

async function telegramPhotoUpload(token,item,caption,keyboard){
  const source=String(item.imageUrl||'');
  if(!/^https:\/\//i.test(source))throw new Error('URL de imagem HTTPS inválida.');
  const parsed=new URL(source);
  if(parsed.username||parsed.password)throw new Error('URL de imagem inválida.');
  const response=await fetch(parsed.toString(),{signal:AbortSignal.timeout(10000),redirect:'follow'});
  if(!response.ok)throw new Error('Não foi possível baixar a imagem original do produto.');
  const type=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!/^image\/(jpeg|png|webp|gif)$/.test(type))throw new Error('A URL não retornou uma imagem compatível.');
  const bytes=await response.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>10*1024*1024)throw new Error('A imagem está vazia ou excede 10 MB.');
  const ext=type==='image/jpeg'?'jpg':type.split('/')[1];
  const boundary='----RadarPromo'+crypto.randomUUID().replace(/-/g,'');
  const encoder=new TextEncoder();
  const chunks=[];
  const field=(name,value)=>chunks.push(encoder.encode('--'+boundary+'\\r\\nContent-Disposition: form-data; name="'+name+'"\\r\\n\\r\\n'+String(value)+'\\r\\n'));
  field('chat_id',String(item.groupExternalId));
  chunks.push(encoder.encode('--'+boundary+'\\r\\nContent-Disposition: form-data; name="photo"; filename="produto.'+ext+'"\\r\\nContent-Type: '+type+'\\r\\n\\r\\n'));
  chunks.push(new Uint8Array(bytes));
  chunks.push(encoder.encode('\\r\\n'));
  field('caption',caption);
  field('parse_mode','HTML');
  if(keyboard)field('reply_markup',JSON.stringify(keyboard));
  chunks.push(encoder.encode('--'+boundary+'--\\r\\n'));
  const body=new Uint8Array(chunks.reduce((total,part)=>total+part.byteLength,0));
  let offset=0;
  for(const part of chunks){body.set(part,offset);offset+=part.byteLength;}
  let responseTelegram,result;
  try{
    responseTelegram=await fetch('https://api.telegram.org/bot'+token+'/sendPhoto',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary='+boundary},body,signal:AbortSignal.timeout(15000)});
    result=await responseTelegram.json();
  }catch(error){
    throw Object.assign(new Error('O Telegram não confirmou o envio da foto. Confira o destino antes de reenviar.'),{code:'DELIVERY_UNCONFIRMED'});
  }
  if(!responseTelegram.ok||!result.ok)throw new Error(String(result.description||'Falha ao enviar a foto ao Telegram').slice(0,300));
  return result.result;
}

export async function sendTelegramOffer(token,item){
  const keyboard=item.affiliateUrl?{inline_keyboard:[[{text:'🛒 Ver oferta',url:item.affiliateUrl}]]}:undefined;
  if(item.contentType==='MESSAGE')return telegramCall(token,'sendMessage',{chat_id:item.groupExternalId,text:telegramHtml(item.message).slice(0,4096),parse_mode:'HTML',link_preview_options:{is_disabled:false,prefer_large_media:true,show_above_text:false},...(keyboard?{reply_markup:keyboard}:{})});
  const caption=telegramHtml(buildTelegramCaption(item.message,item.affiliateUrl)).slice(0,1024);
  try{
    return await telegramPhotoUpload(token,item,caption,keyboard);
  }catch(error){
    const message=String(error?.message||error);
    // Telegram explicitly rejected the remote image URL: fall back to text only.
    // Never fallback on timeouts/network errors because the provider may have accepted the photo.
    if(!/failed to get HTTP URL content|wrong type of the web page content|photo must be|não foi possível baixar a imagem|não retornou uma imagem compatível|url de imagem|imagem está vazia|excede 10 MB/i.test(message))throw error;
    return telegramCall(token,'sendMessage',{chat_id:item.groupExternalId,text:telegramHtml(item.message).slice(0,4096),parse_mode:'HTML',link_preview_options:{is_disabled:false,prefer_large_media:true,show_above_text:false},...(keyboard?{reply_markup:keyboard}:{})});
  }
}
