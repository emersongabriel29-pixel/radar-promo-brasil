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
  return error?.code==='SetupRequired'||/no .*?(api )?key|setup gate|Builder \+ AI|not connected/i.test(String(error?.message||''));
}

export function safePublicUrl(value){
  try{const url=new URL(clean(value,2000));return url.protocol==='https:'?url.toString():''}catch{return ''}
}
