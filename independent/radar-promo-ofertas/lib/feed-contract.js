export function parseInteger(value,fallback,min,max) {
  if(value===undefined||value===null||value==='')return fallback;
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<min||n>max)throw Object.assign(new Error('INVALID_QUERY'),{status:400,code:'INVALID_QUERY'});
  return n;
}
export function validFeed(payload) {
  return !!payload && typeof payload==='object' && !Array.isArray(payload) &&
    Array.isArray(payload.offers) && payload.offers.every(o=>o && typeof o==='object' &&
      typeof o.id==='string' && typeof o.title==='string' &&
      Number.isFinite(Number(o.currentPrice)) && Number(o.currentPrice)>=0) &&
    Number.isSafeInteger(payload.page) && payload.page>=1 &&
    Number.isSafeInteger(payload.limit) && payload.limit>=1 && payload.limit<=60 &&
    Number.isSafeInteger(payload.total) && payload.total>=0 && typeof payload.hasMore==='boolean';
}
export function publicOffer(offer) {
  const {imageStorageKey,image_storage_key,...rest}=offer;
  return {...rest,imageUrl:typeof offer.imageUrl==='string' && /^https:\/\//i.test(offer.imageUrl)?offer.imageUrl:''};
}
