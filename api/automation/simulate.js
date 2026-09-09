import { db } from 'hatchable';
import { validateOffer,categoryHint,offerScore,message } from 'lib/automation.js';

export const access='member';
export const methods=['POST'];

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel para inicializar sua conta.'});
  const checked=validateOffer(req.body||{});
  if(!checked.ok)return res.status(400).json({ok:false,errors:checked.errors});
  const v=checked.value,hint=categoryHint(v.title),score=offerScore(v);
  const cats=await db.query('SELECT id,name FROM categories WHERE account_id=$1 ORDER BY name',[account.id]);
  const category=cats.rows.find(c=>c.name.toLowerCase()===hint.toLowerCase())||cats.rows.find(c=>c.name.toLowerCase().includes('gerais'))||null;
  const groups=category?await db.query("SELECT id,name FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND (category_id=$2 OR category_id IS NULL) ORDER BY name",[account.id,category.id]):{rows:[]};
  return res.json({ok:true,validation:'APPROVED',category,score,groups:groups.rows,message:message(v),payload:{imageUrl:v.imageUrl,affiliateUrl:v.affiliateUrl,title:v.title}});
}
