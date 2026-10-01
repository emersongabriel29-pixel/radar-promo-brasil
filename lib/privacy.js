import {db} from 'hatchable';
import {accountSnapshot} from './backups.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function exportAccountData(accountId){
  const settings=(await db.query('SELECT data_export_enabled FROM account_security_settings WHERE account_id=$1',[accountId])).rows[0];
  if(settings?.data_export_enabled===false)throw fail('Exportação desativada nas preferências desta conta.',412);
  return accountSnapshot(accountId,{portable:true});
}
export async function verifyPrivacyRequest(accountId,id,input,ownerEmail){
  const scope=String(input.subjectScope||''),hash=String(input.subjectHash||''),notes=String(input.evidence||'').trim().slice(0,500);
  if(!['LEAD','ACCOUNT_OWNER'].includes(scope)||notes.length<8||scope==='LEAD'&&!/^[a-zA-Z0-9:_-]{16,128}$/.test(hash))throw fail('Informe escopo, identificador já usado no conector e evidência de identidade.');
  const row=(await db.query("SELECT requester_email FROM privacy_requests WHERE id=$1 AND account_id=$2 AND status IN ('OPEN','IN_PROGRESS')",[id,accountId])).rows[0];if(!row)throw fail('Solicitação não encontrada.',404);
  if(scope==='ACCOUNT_OWNER'&&(!ownerEmail||row.requester_email.toLowerCase()!==String(ownerEmail).toLowerCase()))throw fail('O e-mail da solicitação deve coincidir com a identidade autenticada da conta.',403);
  await db.query("UPDATE privacy_requests SET subject_scope=$3,subject_hash=$4,identity_verified_at=now(),resolution_notes=$5,status='IN_PROGRESS' WHERE id=$1 AND account_id=$2",[id,accountId,scope,scope==='LEAD'?hash:'',notes]);
  return {verified:true};
}
export async function resolvePrivacyRequest(accountId,id,input){
  const row=(await db.query("SELECT * FROM privacy_requests WHERE id=$1 AND account_id=$2 AND status IN ('IN_PROGRESS','DONE') AND identity_verified_at IS NOT NULL",[id,accountId])).rows[0];if(!row)throw fail('Verifique a identidade antes de processar esta solicitação.',412);
  let data;
  if(['ACCESS','PORTABILITY'].includes(row.request_type)){
    data=row.subject_scope==='ACCOUNT_OWNER'?await exportAccountData(accountId):{
      scope:'LEAD',leadEvents:(await db.query('SELECT group_id,event_type,phone_hash,ddd,occurred_at FROM lead_events WHERE account_id=$1 AND phone_hash=$2',[accountId,row.subject_hash])).rows,
      messagingEvents:(await db.query('SELECT channel,event_type,contact_hash,consent_recorded,last_interaction_at,decision,created_at FROM messaging_compliance_events WHERE account_id=$1 AND contact_hash=$2',[accountId,row.subject_hash])).rows
    };
  }else if(['DELETION','REVOCATION'].includes(row.request_type)&&row.subject_scope==='LEAD'){
    if(input.confirmation!=='ANONIMIZAR')throw fail('Confirme ANONIMIZAR para remover os identificadores deste contato.');
    await db.transaction([
      {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
      {sql:'UPDATE lead_events SET phone_hash=NULL,ddd=NULL WHERE account_id=$1 AND phone_hash=$2',params:[accountId,row.subject_hash]},
      {sql:"UPDATE messaging_compliance_events SET contact_hash='',metadata='{}'::jsonb WHERE account_id=$1 AND contact_hash=$2",params:[accountId,row.subject_hash]},
      {sql:"UPDATE privacy_requests SET status='DONE',resolved_at=now() WHERE id=$1 AND account_id=$2",params:[id,accountId]}
    ]);
    data={scope:'LEAD',anonymized:true,externalProviders:'Solicitar tratamento também aos provedores que guardam dados fora deste aplicativo.'};
  }else if(row.request_type==='CORRECTION'&&row.subject_scope==='LEAD'){
    const ddd=String(input.ddd||'');if(!/^\d{2,3}$/.test(ddd))throw fail('Informe o DDD corrigido.');
    await db.query('UPDATE lead_events SET ddd=$3 WHERE account_id=$1 AND phone_hash=$2',[accountId,row.subject_hash,ddd]);data={corrected:true};
  }else throw fail('Esta solicitação exige ação do titular na identidade/serviço externo; mantenha a solicitação em andamento e registre a resolução.',412);
  await db.transaction([
    {sql:"UPDATE privacy_requests SET status='DONE',resolved_at=now() WHERE id=$1 AND account_id=$2",params:[id,accountId]},
    {sql:"INSERT INTO security_events(account_id,event_type,severity,details) VALUES($1,'PRIVACY_REQUEST_RESOLVED','INFO',$2)",params:[accountId,JSON.stringify({requestId:id,type:row.request_type,scope:row.subject_scope})]}
  ]);
  return {resolved:true,data};
}
export async function runRetention({preview=false,accountId=null}={}){
  const rows=(await db.query("SELECT s.account_id,s.retention_days FROM account_security_settings s JOIN accounts a ON a.id=s.account_id WHERE a.status='ACTIVE' AND s.retention_enabled AND ($1::text IS NULL OR s.account_id=$1)",[accountId])).rows;let removed=0;
  for(const row of rows){
    if(preview){const result=await db.query("SELECT (SELECT count(*) FROM lead_events WHERE account_id=$1 AND occurred_at<now()-($2::text||' days')::interval)+(SELECT count(*) FROM messaging_compliance_events WHERE account_id=$1 AND created_at<now()-($2::text||' days')::interval) AS n",[row.account_id,row.retention_days]);removed+=Number(result.rows[0].n);continue;}
    const result=await db.transaction([
      {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[row.account_id]},
      {sql:"DELETE FROM lead_events WHERE account_id=$1 AND occurred_at<now()-($2::text||' days')::interval AND EXISTS(SELECT 1 FROM account_security_settings WHERE account_id=$1 AND retention_enabled AND retention_days=$2::integer) RETURNING id",params:[row.account_id,row.retention_days]},
      {sql:"DELETE FROM messaging_compliance_events WHERE account_id=$1 AND created_at<now()-($2::text||' days')::interval AND EXISTS(SELECT 1 FROM account_security_settings WHERE account_id=$1 AND retention_enabled AND retention_days=$2::integer) RETURNING id",params:[row.account_id,row.retention_days]}
    ]);removed+=result.results[1].rows.length+result.results[2].rows.length;
  }
  return {enabledAccounts:rows.length,removed,preview,scope:'LEAD_AND_MESSAGING_EVENTS'};
}
