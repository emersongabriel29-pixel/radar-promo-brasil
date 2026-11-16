import {readFeed} from 'lib/radar-feed.js';
import {identifier} from 'lib/community.js';
export const access='public';
export const methods=['GET'];
export default async function(req,res){res.setHeader('Cache-Control','private, no-store');try{const id=identifier(req.params.id);const r=await readFeed({id,limit:1});const offer=r.offers.find(o=>o.id===id);if(!offer)return res.status(404).json({code:'OFFER_NOT_AVAILABLE'});return res.json({offer});}catch(e){return res.status(e.status||503).json({code:e.code||'SERVICE_UNAVAILABLE'});}}
