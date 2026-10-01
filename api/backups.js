import {db,storage} from 'hatchable';
import {createAccountBackup,sha256} from 'lib/backups.js';
export const access='member';
export const methods=['GET','POST'];
export default async function(req,res){
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel para iniciar sua conta.'});
  try{
    if(req.method==='POST')return res.status(201).json(await createAccountBackup(account.id));
    const id=String(req.query?.id||'');
    if(!id)return res.json({backups:(await db.query('SELECT id,sha256,bytes,row_counts AS "rowCounts",created_at AS "createdAt" FROM operational_backups WHERE account_id=$1 ORDER BY created_at DESC LIMIT 30',[account.id])).rows});
    const row=(await db.query('SELECT storage_key,sha256 FROM operational_backups WHERE id=$1 AND account_id=$2',[id,account.id])).rows[0];if(!row)return res.status(404).json({error:'Backup não encontrado.'});
    const object=await storage.get(row.storage_key),bytes=object.buffer instanceof Uint8Array?object.buffer:new Uint8Array(object.buffer);
    if(await sha256(bytes)!==row.sha256)return res.status(409).json({error:'A integridade do backup não foi confirmada.'});
    res.setHeader('Content-Type','application/json');res.setHeader('Content-Disposition','attachment; filename="radar-backup-'+id+'.json"');res.setHeader('Cache-Control','no-store');return res.send(new TextDecoder().decode(bytes));
  }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'Não foi possível concluir o backup.'});}
}
