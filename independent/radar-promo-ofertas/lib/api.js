import {db} from 'hatchable';
import {requireRealOffer} from 'lib/radar-feed.js';
import {identifier,requireIdentity,ensureSameOrigin} from 'lib/community.js';
export async function respond(req,res,handler,{verifyOffer=false}={}){
  res.setHeader('Cache-Control','private, no-store');
  try{
    if(req.method!=='GET'){requireIdentity(req);ensureSameOrigin(req);}
    if(verifyOffer && req.method==='POST')await requireRealOffer(identifier(req.body?.offerId));
    return res.json(await handler(db,req));
  }catch(error){
    if(error.status===429||error.status===503)res.setHeader('Retry-After','60');
    const status=Number.isInteger(error.status)?error.status:503;
    return res.status(status).json({error:'Não foi possível concluir esta operação.',code:error.code||'SERVICE_UNAVAILABLE'});
  }
}
