const BOT=/(whatsapp\\/|facebookexternalhit|facebot|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|googlebot|google-read-aloud|bingbot|applebot|bot\\b|crawler|spider|preview|curl\\/|wget\\/|python-requests|node-fetch|undici|headless)/i;
const seen=new Map();
const WINDOW_MS=30*60*1000;

export async function shouldCountClick(req,id,now=Date.now()){
  if(req.method==='HEAD')return false;
  const agent=String(req.headers?.['user-agent']||'');
  if(!agent||BOT.test(agent))return false;
  const raw=String(id)+'|'+String(req.ip||'')+'|'+agent;
  const subtle=globalThis.crypto?.subtle;
  if(!subtle)return false;
  const bytes=await subtle.digest('SHA-256',new TextEncoder().encode(raw));
  const key=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
  const last=seen.get(key);
  if(last&&now-last<WINDOW_MS)return false;
  seen.set(key,now);
  if(seen.size>10000)for(const [k,t] of seen)if(now-t>=WINDOW_MS)seen.delete(k);
  return true;
}
