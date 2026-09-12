import { db } from "hatchable";
export const access = "public";
export const methods = ["GET"];
export default async function(req,res){
  const id=String(req.params.id||"");
  const q=await db.query("SELECT p.id,p.account_id,p.offer_id,p.group_id,o.affiliate_url,o.source FROM publications p JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id WHERE p.id=$1",[id]);
  if(!q.rows.length){
    const social=await db.query("SELECT sp.id,sp.affiliate_url FROM social_posts sp WHERE sp.id=$1",[id]);
    if(!social.rows.length)return res.status(404).send("Link não encontrado.");
    await db.query("UPDATE social_posts SET clicks=clicks+1,updated_at=now() WHERE id=$1",[id]);
    return res.redirect(social.rows[0].affiliate_url);
  }
  await db.query("UPDATE publications SET clicks=clicks+1 WHERE id=$1",[id]);
  await db.query('INSERT INTO click_events(account_id,publication_id,offer_id,group_id,marketplace) VALUES($1,$2,$3,$4,$5)',[q.rows[0].account_id,id,q.rows[0].offer_id,q.rows[0].group_id,String(q.rows[0].source||'OUTRO').toUpperCase().replace(/ /g,'_')]);
  return res.redirect(q.rows[0].affiliate_url);
}
