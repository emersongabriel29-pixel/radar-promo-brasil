import { db } from 'hatchable';
import { MESSAGE_TEMPLATES,formatPromo } from 'lib/promo-message.js';

export const access='member';
export const methods=['GET','POST'];

export default async function(req,res){
  if(req.method==='GET')return res.json({templates:MESSAGE_TEMPLATES});
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  try{
    const b=req.body||{},result=formatPromo({title:b.title,currentPrice:Math.round(Number(b.currentPrice||0)*100),originalPrice:b.originalPrice?Math.round(Number(b.originalPrice)*100):0,affiliateUrl:b.affiliateUrl,couponCode:b.couponCode,couponUrl:b.couponUrl,category:b.category,source:b.source,template:b.template});
    return res.json({ok:true,...result,characters:result.message.length,whatsappReady:result.message.length<=4096,telegramReady:result.message.length<=1024,package:['IMAGE','MESSAGE','AFFILIATE_LINK']});
  }catch(error){return res.status(400).json({error:error.message})}
}
