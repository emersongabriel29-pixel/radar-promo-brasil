import { db,storage } from 'hatchable';

export const access='public';
export const methods=['GET'];

export default async function(req,res){
  const id=String(req.params.id||'').trim();
  if(!id)return res.status(404).send('Arquivo não encontrado.');
  const row=(await db.query(
    "SELECT o.image_storage_key AS \"storageKey\" FROM offers o JOIN accounts a ON a.id=o.account_id WHERE o.id=$1 AND a.status='ACTIVE' AND ((EXISTS(SELECT 1 FROM storefront_settings s WHERE s.account_id=a.id AND s.published=true) AND o.storefront_visible=true AND o.status IN ('APPROVED','PUBLISHED')) OR EXISTS(SELECT 1 FROM publications p WHERE p.offer_id=o.id AND p.account_id=o.account_id AND p.status IN ('DISPATCHING','WAITING_CONFIRMATION','PUBLISHED')))",
    [id]
  )).rows[0];
  if(!row?.storageKey)return res.status(404).send('Arquivo não encontrado.');
  const file=await storage.get(row.storageKey);
  res.setHeader('Content-Type',file.contentType||'application/octet-stream');
  res.setHeader('Content-Disposition','inline');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, max-age=60, stale-while-revalidate=300');
  return res.send(file.buffer);
}
