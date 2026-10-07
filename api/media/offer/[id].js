import { db,storage } from 'hatchable';

export const access='member';
export const methods=['GET'];

export default async function(req,res){
  const id=String(req.params.id||'').trim();
  if(!id)return res.status(404).send('Arquivo não encontrado.');
  const row=(await db.query(
    'SELECT o.image_storage_key AS "storageKey" FROM offers o JOIN accounts a ON a.id=o.account_id WHERE o.id=$1 AND a.owner_member_id=$2',
    [id,String(req.member.id)]
  )).rows[0];
  if(!row?.storageKey)return res.status(404).send('Arquivo não encontrado.');
  const file=await storage.get(row.storageKey);
  res.setHeader('Content-Type',file.contentType||'application/octet-stream');
  res.setHeader('Content-Disposition','inline');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','private, no-store');
  return res.send(file.buffer);
}
