import { parseOfferMessage, parseOfferMessageBatch } from 'lib/offer-message-parser.js';
export const access='member';
export const methods=['POST'];
export default async function(req,res){
 try{const raw=String(req.body?.text||'');if(!raw.trim())return res.status(400).json({ok:false,error:'Cole o texto da oferta para interpretar.'});if(raw.length>12000)return res.status(413).json({ok:false,error:'A mensagem excede o limite de 12.000 caracteres.'});const batch=req.body?.batch===true?parseOfferMessageBatch(raw):null;if(batch?.multiple)return res.json({ok:batch.items.some(item=>item.ok),multiple:true,items:batch.items,omitted:batch.omitted,autoPublish:false,notice:'Cada oferta exige revisão individual. Nenhuma será publicada automaticamente.'});const result=parseOfferMessage(raw);return res.json({ok:result.ok,...result,canImport:result.ok,autoPublish:false,notice:'A interpretação é preliminar. O Radar não publica automaticamente; valide preço e link de afiliado antes de aprovar.'});}
 catch{return res.status(400).json({ok:false,error:'Não foi possível interpretar esta mensagem.'});}
}
