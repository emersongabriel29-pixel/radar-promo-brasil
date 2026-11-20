export const access='user';
export const methods=['GET'];
export default async function(req,res){res.setHeader('Cache-Control','private, no-store');return res.json({id:req.user.id,name:req.user.name||'',email:req.user.email||''});}
