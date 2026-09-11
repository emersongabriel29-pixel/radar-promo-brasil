import { db,storage } from 'hatchable';

export const access='member';
export const methods=['GET'];

export default async function(req,res){
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(404).send('Arquivo não encontrado.');
  const row=(await db.query("SELECT kind,storage_key FROM media_generation_jobs WHERE id=$1 AND account_id=$2 AND status IN ('COMPLETED','FALLBACK_COMPLETED')",[String(req.params.id||''),account.id])).rows[0];
  if(!row?.storage_key)return res.status(404).send('Arquivo não encontrado.');
  const file=await storage.get(row.storage_key);
  res.setHeader('Content-Type',file.contentType||(row.kind==='VIDEO'?'video/mp4':'image/png'));
  res.setHeader('Cache-Control','private, max-age=3600');
  return res.send(file.buffer);
}
