import { db } from 'hatchable';
import { validateOffer,categoryHint,offerScore,message } from 'lib/automation.js';

export const access='admin';
export const methods=['POST'];

export default async function(req,res){
  const checked=validateOffer(req.body||{});
  if(!checked.ok)return res.status(400).json({ok:false,errors:checked.errors});
  const v=checked.value,hint=categoryHint(v.title),score=offerScore(v);
  const cats=await db.query('SELECT id,name FROM categories ORDER BY name');
  const category=cats.rows.find(c=>c.name.toLowerCase()===hint.toLowerCase())||cats.rows.find(c=>c.name.toLowerCase().includes('gerais'))||null;
  const groups=category?await db.query("SELECT id,name FROM promo_groups WHERE status='ACTIVE' AND (category_id=$1 OR category_id IS NULL) ORDER BY name",[category.id]):{rows:[]};
  return res.json({ok:true,validation:'APPROVED',category,score,groups:groups.rows,message:message(v),payload:{imageUrl:v.imageUrl,affiliateUrl:v.affiliateUrl,title:v.title}});
}
