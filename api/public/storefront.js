import { db } from 'hatchable';

export const access='public';
export const methods=['GET'];

export default async function(req,res){
  const slug=String(req.query.slug||'').trim().slice(0,100);
  if(!slug)return res.status(400).json({error:'Vitrine não informada.'});
  const a=(await db.query("SELECT a.id,a.name,a.slug,s.title,s.description,s.logo_url AS \"logoUrl\",s.primary_color AS \"primaryColor\" FROM accounts a JOIN storefront_settings s ON s.account_id=a.id WHERE a.slug=$1 AND a.status='ACTIVE' AND s.published=true",[slug])).rows[0];
  if(!a)return res.status(404).json({error:'Vitrine indisponível.'});
  const offers=(await db.query("SELECT id,title,source,current_price AS \"currentPrice\",original_price AS \"originalPrice\",image_url AS \"imageUrl\",affiliate_url AS \"affiliateUrl\",discount_percent AS \"discountPercent\" FROM offers WHERE account_id=$1 AND storefront_visible=true AND status IN ('APPROVED','PUBLISHED') ORDER BY created_at DESC LIMIT 100",[a.id])).rows;
  res.setHeader('Cache-Control','public, max-age=60');
  return res.json({store:a,offers});
}
