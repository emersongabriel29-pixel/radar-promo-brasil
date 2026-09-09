import { db } from "hatchable";
export const access = "public";
export const methods = ["GET"];
export default async function(req,res){
  const id=String(req.params.id||"");
  const q=await db.query("SELECT p.id,o.affiliate_url FROM publications p JOIN offers o ON o.id=p.offer_id WHERE p.id=$1",[id]);
  if(!q.rows.length)return res.status(404).send("Link não encontrado.");
  await db.query("UPDATE publications SET clicks=clicks+1 WHERE id=$1",[id]);
  return res.redirect(q.rows[0].affiliate_url);
}
