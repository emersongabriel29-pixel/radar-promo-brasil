export function validBotToken(token){
  return /^\d{6,14}:[A-Za-z0-9_-]{20,}$/.test(String(token||'').trim());
}

export function buildTelegramCaption(message,affiliateUrl,max=1024){
  const link=String(affiliateUrl||'').trim();
  const body=String(message||'').trim();
  const suffix=link?'\n\n🛒 Ver oferta: '+link:'';
  const room=Math.max(0,max-suffix.length);
  if(body.length<=room)return body+suffix;
  let clipped='';
  for(const char of body){if((clipped+char).length>Math.max(0,room-1))break;clipped+=char;}
  return clipped+'…'+suffix;
}
