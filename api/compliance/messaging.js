import { db } from 'hatchable';
import { evaluateMessagingWindow,recordComplianceEvent,complianceReport } from 'lib/messaging-compliance.js';

export const access='member';
export const methods=['GET','POST'];
async function account(member){return (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(member.id)])).rows[0]}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const a=await account(req.member);if(!a)return res.status(412).json({error:'Conta não identificada.'});
  try{
    if(req.method==='GET')return res.json({ok:true,...await complianceReport(a.id,req.query.days)});
    const input=req.body||{},result=evaluateMessagingWindow(input);
    await recordComplianceEvent(a.id,input,result);
    return res.status(result.allowed?200:422).json({ok:result.allowed,...result});
  }catch(e){console.error('compliance/messaging',e);return res.status(500).json({error:'Não foi possível gerar o relatório de conformidade.'})}
}
