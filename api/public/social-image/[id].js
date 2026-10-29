import { db,storage } from 'hatchable';

export const access='public';
export const methods=['GET'];

export default async function(req,res){
  const id=String(req.params.id||'').trim();
  if(!id)return res.status(404).send('Imagem não encontrada.');
  const row=(await db.query("SELECT j.storage_key AS key FROM social_posts p JOIN media_generation_jobs j ON j.id=p.image_job_id AND j.account_id=p.account_id WHERE p.id=$1 AND p.image_job_id IS NOT NULL AND p.status IN ('PUBLISHING','PUBLISHED','RETRY','WAITING_CONFIRMATION') AND j.kind='IMAGE' AND j.status IN ('COMPLETED','FALLBACK_COMPLETED')",[id])).rows[0];
  if(!row?.key)return res.status(404).send('Imagem não encontrada.');
  const file=await storage.get(row.key);
  res.setHeader('Content-Type',file.contentType||'image/png');
  res.setHeader('Content-Disposition','inline');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, max-age=86400, immutable');
  return res.send(file.buffer);
}