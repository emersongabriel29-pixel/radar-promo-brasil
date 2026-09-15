const buckets=new Map();

export function requestKey(req){
  const member=String(req?.member?.id||'').trim();
  const ip=String(req?.ip||req?.headers?.['x-forwarded-for']||'unknown').split(',')[0].trim();
  return member?member+'|'+ip:ip;
}

export function createRateLimiter({windowMs=60_000,max=180}={}){
  return function rateLimit(req,res,next){
    const now=Date.now(),key=requestKey(req);
    let bucket=buckets.get(key);
    if(!bucket||now-bucket.startedAt>=windowMs)bucket={startedAt:now,count:0};
    bucket.count+=1;buckets.set(key,bucket);
    if(buckets.size>5000)for(const [k,v] of buckets)if(now-v.startedAt>=windowMs)buckets.delete(k);
    const remaining=Math.max(0,max-bucket.count);
    const reset=Math.ceil((bucket.startedAt+windowMs-now)/1000);
    res.setHeader('X-RateLimit-Limit',String(max));
    res.setHeader('X-RateLimit-Remaining',String(remaining));
    res.setHeader('X-RateLimit-Reset',String(reset));
    if(bucket.count>max){
      res.setHeader('Retry-After',String(reset));
      return res.status(429).json({error:'Limite temporário de requisições atingido.',retryAfterSeconds:reset});
    }
    next();
  };
}

export function applySecurityHeaders(res,{production=false,api=false}={}){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; connect-src 'self' https:");
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  if(api)res.setHeader('Cache-Control','no-store');
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
}
