import { db } from 'hatchable';
import { MESSAGE_TEMPLATES,formatPromo } from 'lib/promo-message.js';
import {moneyCents} from 'lib/validation.js';

export const access='member';
export const methods=['GET','POST'];

export default async function(req,res){
  if(req.method==='GET')return res.json({templates:MESSAGE_TEMPLATES});
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  try{
    const b=req.body||{},result=formatPromo({title:b.title,currentPrice:moneyCents(b.currentPrice),originalPrice:b.originalPrice?moneyCents(b.originalPrice):0,affiliateUrl:b.affiliateUrl,couponCode:b.couponCode,couponUrl:b.couponUrl,category:b.category,source:b.source,template:b.template});
    const storefront=(await db.query('SELECT collshp_url AS url FROM storefront_settings WHERE account_id=$1',[account.id])).rows[0]?.url||'';
    if(storefront&&!result.message.includes(storefront))result.message+=String.fromCharCode(10,10)+'Veja mais ofertas na minha vitrine: '+storefront;
    return res.json({ok:true,...result,characters:result.message.length,whatsappReady:result.message.length<=4096,telegramReady:result.message.length<=1024,storefrontUrl:storefront,package:['IMAGE','MESSAGE','AFFILIATE_LINK']});
  }catch(error){return res.status(400).json({error:error.message})}
}
