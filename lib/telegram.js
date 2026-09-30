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

export async function sendTelegramOffer(token,item){
  const caption=buildTelegramCaption(item.message,item.affiliateUrl);
  return telegramCall(token,'sendPhoto',{chat_id:item.groupExternalId,photo:item.imageUrl,caption,reply_markup:{inline_keyboard:[[{text:'🛒 Ver oferta',url:item.affiliateUrl}]]}});
}
