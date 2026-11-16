import { config } from 'hatchable';
import {parseInteger,validFeed,publicOffer} from 'lib/feed-contract.js';
export async function readFeed(query={}) {
  try {
    const base=await config.get('radar_api_url'),token=await config.get('RADAR_API_TOKEN');
    if(!base||!token)throw Object.assign(new Error(),{status:503,code:'RADAR_CONNECTION_NOT_CONFIGURED'});
    let url;try{url=new URL(base);}catch{throw Object.assign(new Error(),{status:503,code:'RADAR_INVALID_CONFIGURATION'});}
    if(url.protocol!=='https:'||url.hostname!=='radar-promo-brasil.hatchable.site'||url.pathname!=='/api/public/offers-feed'||url.username||url.password||url.hash||url.port)throw Object.assign(new Error(),{status:503,code:'RADAR_INVALID_CONFIGURATION'});
    url.search='';
    url.searchParams.set('page',String(parseInteger(query.page,1,1,10000)));
    url.searchParams.set('limit',String(parseInteger(query.limit,30,1,60)));
    for(const key of ['q','category','id'])if(query[key]!==undefined){
      if(typeof query[key]!=='string')throw Object.assign(new Error(),{status:400,code:'INVALID_QUERY'});
      url.searchParams.set(key,query[key].trim().slice(0,key==='q'?120:128));
    }
    const sort=query.sort||'recent';
    if(!['recent','discount','score'].includes(sort))throw Object.assign(new Error(),{status:400,code:'INVALID_QUERY'});
    url.searchParams.set('sort',sort);
    const r=await fetch(url.toString(),{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},timeout_ms:12000,redirect:'error'});
    if(r.status===429)throw Object.assign(new Error(),{status:503,code:'RADAR_CAPACITY_REACHED'});
    if(!r.ok)throw Object.assign(new Error(),{status:502,code:'RADAR_UPSTREAM_ERROR'});
    let payload;try{payload=await r.json();}catch{throw Object.assign(new Error(),{status:502,code:'RADAR_INVALID_RESPONSE'});}
    if(!validFeed(payload))throw Object.assign(new Error(),{status:502,code:'RADAR_INVALID_RESPONSE'});
    return {...payload,offers:payload.offers.map(publicOffer)};
  }catch(error){
    if(error.code)throw error;
    throw Object.assign(new Error(),{status:502,code:'RADAR_CONNECTION_ERROR'});
  }
}
export async function requireRealOffer(id){
  const payload=await readFeed({id,limit:1});
  if(!payload.offers.some(o=>o.id===id))throw Object.assign(new Error(),{status:404,code:'OFFER_NOT_AVAILABLE'});
}
