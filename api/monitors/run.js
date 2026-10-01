import {db} from 'hatchable';
import {runMonitors,canActivateMonitor} from 'lib/monitoring.js';
export const access='member';
export const methods=['POST'];
export default async function(req,res){
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel para iniciar sua conta.'});
  try{
    const id=String(req.body?.monitorId||'');await canActivateMonitor(account.id,id);
    const row=(await db.query("SELECT source_type,status FROM monitors WHERE id=$1 AND account_id=$2",[id,account.id])).rows[0];
    if(row.status!=='ACTIVE'||!['FEED','MARKETPLACE'].includes(row.source_type))return res.status(412).json({error:'Ative um feed ou anúncio autorizado para executar a captura. Eventos de grupos chegam pelo conector.'});
    return res.json(await runMonitors({accountId:account.id,monitorId:id,manual:true}));
  }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'Não foi possível executar o monitor.'});}
}
