import { db,storage } from 'hatchable';

export const access='member';
export const methods=['GET'];
export default async function(req,res) {
  if(!req.member)return res.status(401).send('Não autorizado.');
  const account=(await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(req.member.id)])).rows[0];
  if(!account)return res.status(404).send('Arquivo não encontrado.');
  const row=(await db.query("SELECT storage_key,content_type FROM video_studio_projects WHERE id=$1 AND account_id=$2 AND status='READY'",[String(req.params.id||''),account.id])).rows[0];
  if(!row?.storage_key)return res.status(404).send('Arquivo não encontrado.');
  const file=await storage.get(row.storage_key);
  res.setHeader('Content-Type',file.contentType||row.content_type||'video/webm');
  res.setHeader('Content-Disposition','inline; filename="radar-video-'+String(req.params.id||'video')+'.'+(row.content_type==='video/mp4'?'mp4':'webm')+'"');
  res.setHeader('Cache-Control','private, max-age=3600');
  return res.send(file.buffer);
}