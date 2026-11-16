import {readFeed} from 'lib/radar-feed.js';
export const access='public';
export const methods=['GET'];
export default async function(req,res){
  res.setHeader('Cache-Control','private, no-store');
  try{return res.json(await readFeed(req.query||{}));}
  catch(error){if(error.status===503)res.setHeader('Retry-After','60');return res.status(error.status||502).json({error:'Não foi possível consultar as ofertas agora.',code:error.code||'RADAR_CONNECTION_ERROR'});}
}
