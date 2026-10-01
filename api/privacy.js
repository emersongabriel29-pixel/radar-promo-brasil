import {db} from 'hatchable';
import {exportAccountData,verifyPrivacyRequest,resolvePrivacyRequest,runRetention} from 'lib/privacy.js';
export const access='member';
export const methods=['GET','POST'];
export default async function(req,res){
  const a=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];if(!a)return res.status(412).json({error:'Abra o painel para iniciar sua conta.'});
  try{
    if(req.method==='GET'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Disposition','attachment; filename="radar-portabilidade.json"');return res.json(await exportAccountData(a.id));}
    const b=req.body||{};if(b.action==='VERIFY')return res.json(await verifyPrivacyRequest(a.id,String(b.id||''),b,req.member.email));
    if(b.action==='RESOLVE')return res.json(await resolvePrivacyRequest(a.id,String(b.id||''),b));
    if(b.action==='RETENTION_PREVIEW')return res.json(await runRetention({accountId:a.id,preview:true}));
    return res.status(400).json({error:'Ação inválida.'});
  }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'Não foi possível processar a solicitação.'});}
}
