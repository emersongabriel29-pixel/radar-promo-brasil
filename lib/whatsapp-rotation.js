import { db } from 'hatchable';
import { claimStatements } from './delivery.js';

export const MAX_WHATSAPP_CONNECTIONS=5;
export const WHATSAPP_PROVIDERS=['N8N','EVOLUTION','OFFICIAL_API'];
export function phoneNumber(value){
  const raw=String(value||'').trim();
  if(!raw.startsWith('+'))return '';
  const normalized='+'+raw.slice(1).replace(/[\s().-]/g,'');
  return /^\+[1-9]\d{7,14}$/.test(normalized)?normalized:'';
}
const error=(message,status=400)=>Object.assign(new Error(message),{status});

export async function createWhatsappConnection(accountId,input){
  const name=String(input.name||'').trim().slice(0,100),phone=phoneNumber(input.phoneNumber),externalId=String(input.externalId||'').trim().slice(0,200),provider=String(input.provider||'N8N');
  const priority=Number(input.priority??100),interval=Number(input.intervalSeconds??60);
  if(!name||!phone||!externalId||!WHATSAPP_PROVIDERS.includes(provider)||!Number.isInteger(priority)||priority<1||priority>9999||!Number.isInteger(interval)||interval<30||interval>3600)throw error('Informe nome, número com +DDI, identificação do conector e intervalo entre 30 e 3600 segundos.');
  const id=crypto.randomUUID();
  const result=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:"INSERT INTO whatsapp_connections(id,account_id,name,phone_number,provider,external_id,priority,interval_seconds,status) SELECT $1,$2,$3,$4,$5,$6,$7,$8,'PAUSED' WHERE (SELECT count(*) FROM whatsapp_connections WHERE account_id=$2 AND status<>'ARCHIVED')<5 AND NOT EXISTS(SELECT 1 FROM whatsapp_connections WHERE account_id=$2 AND phone_number=$4 AND status<>'ARCHIVED') ON CONFLICT DO NOTHING RETURNING id",params:[id,accountId,name,phone,provider,externalId,priority,interval]}
  ]);
  if(!result.results[1].rows.length)throw error('Limite de cinco números por conta atingido ou número já cadastrado.',409);
  return id;
}

export async function changeWhatsappConnection(accountId,input){
  const id=String(input.id||'').slice(0,100),status=String(input.status||'');
  if(!['ACTIVE','PAUSED'].includes(status))throw error('Status inválido.');
  const result=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:"UPDATE whatsapp_connections SET status=$3 WHERE id=$1 AND account_id=$2 AND status<>'ARCHIVED' AND ($3='PAUSED' OR (phone_number<>'' AND external_id<>'' AND group_messaging_supported AND last_verified_at>now()-interval '24 hours')) RETURNING id",params:[id,accountId,status]}
  ]);
  if(!result.results[1].rows.length){
    if(!(await db.query("SELECT id FROM whatsapp_connections WHERE id=$1 AND account_id=$2 AND status<>'ARCHIVED'",[id,accountId])).rows.length)throw error('Conexão não encontrada.',404);
    throw error('O conector deve confirmar este número e o suporte ao grupo antes da ativação.',412);
  }
}

export async function editWhatsappConnection(accountId,input){
  const name=String(input.name||'').trim().slice(0,100),phone=phoneNumber(input.phoneNumber),external=String(input.externalId||'').trim().slice(0,200),provider=String(input.provider||'N8N'),priority=Number(input.priority??100),interval=Number(input.intervalSeconds??60);
  if(!name||!phone||!external||!WHATSAPP_PROVIDERS.includes(provider)||!Number.isInteger(priority)||priority<1||priority>9999||!Number.isInteger(interval)||interval<30||interval>3600)throw error('Confira nome, número, conector, prioridade e intervalo.');
  try{
    const result=await db.transaction([
      {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
      {sql:"UPDATE whatsapp_connections SET name=$3,phone_number=$4,external_id=$5,provider=$6,priority=$7,interval_seconds=$8,status=CASE WHEN phone_number<>$4 OR external_id<>$5 OR provider<>$6 THEN 'PAUSED' ELSE status END,last_verified_at=CASE WHEN phone_number<>$4 OR external_id<>$5 OR provider<>$6 THEN NULL ELSE last_verified_at END,group_messaging_supported=CASE WHEN phone_number<>$4 OR external_id<>$5 OR provider<>$6 THEN false ELSE group_messaging_supported END WHERE id=$1 AND account_id=$2 AND status<>'ARCHIVED' AND NOT EXISTS(SELECT 1 FROM publications WHERE account_id=$2 AND connection_id=$1 AND status IN ('DISPATCHING','WAITING_CONFIRMATION')) RETURNING id",params:[String(input.id||'').slice(0,100),accountId,name,phone,external,provider,priority,interval]}
    ]);
    if(!result.results[1].rows.length)throw error('Conexão não encontrada ou com entrega aguardando confirmação.',409);
  }catch(e){if(e.code==='23505')throw error('Este número já está cadastrado.',409);throw e;}
}

export async function archiveWhatsappConnection(accountId,id){
  const result=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:"UPDATE whatsapp_connections SET status='ARCHIVED' WHERE id=$1 AND account_id=$2 AND status<>'ARCHIVED' AND NOT EXISTS(SELECT 1 FROM publications WHERE account_id=$2 AND connection_id=$1 AND status IN ('DISPATCHING','WAITING_CONFIRMATION')) RETURNING id",params:[id,accountId]}
  ]);
  if(!result.results[1].rows.length)throw error('Conexão não encontrada ou com entrega aguardando confirmação.',409);
}

// The account lock covers selection, claim and cursor advancement together.
export async function claimNextWhatsapp(id,accountId){
  const candidate=`(SELECT w.id FROM whatsapp_connections w LEFT JOIN account_settings s ON s.account_id=w.account_id WHERE w.account_id=p.account_id AND g.whatsapp_destination_type='GROUP' AND w.status='ACTIVE' AND w.external_id<>'' AND w.group_messaging_supported AND w.verified_groups @> jsonb_build_array(g.external_id) AND w.last_verified_at>now()-interval '24 hours' AND (w.last_dispatched_at IS NULL OR w.last_dispatched_at<=now()-(w.interval_seconds::text||' seconds')::interval) AND NOT EXISTS(SELECT 1 FROM publications f WHERE f.account_id=w.account_id AND f.connection_id=w.id AND f.status='DISPATCHING') ORDER BY CASE WHEN COALESCE(s.whatsapp_rotation_enabled,true) THEN w.last_dispatch_sequence ELSE 0 END,w.priority,w.created_at,w.id LIMIT 1)`;
  const statements=claimStatements(id,accountId,null,candidate);
  const result=await db.transaction([
    ...statements,
    {sql:"UPDATE account_settings SET whatsapp_dispatch_sequence=whatsapp_dispatch_sequence+1 WHERE account_id=$1 AND EXISTS(SELECT 1 FROM publications WHERE id=$2 AND account_id=$1 AND status='DISPATCHING' AND dispatch_token=$3) RETURNING whatsapp_dispatch_sequence",params:[accountId,id,statements[1].params[3]]},
    {sql:"UPDATE whatsapp_connections w SET last_dispatched_at=now(),last_dispatch_sequence=s.whatsapp_dispatch_sequence FROM account_settings s,publications p WHERE s.account_id=$1 AND p.id=$2 AND p.account_id=$1 AND p.status='DISPATCHING' AND p.dispatch_token=$3 AND w.id=p.connection_id AND w.account_id=$1 RETURNING w.id,w.name,w.phone_number,w.provider,w.external_id",params:[accountId,id,statements[1].params[3]]}
  ]);
  const claim=result.results[1].rows[0],connection=result.results[3].rows[0];
  return claim&&connection?{...claim,connectionId:connection.id,connectionName:connection.name,connectionPhone:connection.phone_number,connectionProvider:connection.provider,connectionExternalId:connection.external_id}:null;
}

export async function reportWhatsappConnection(accountId,input){
  const id=String(input.connectionId||'').slice(0,100),phone=phoneNumber(input.phoneNumber),connected=input.status==='CONNECTED';
  if(!id||!phone||!['CONNECTED','DISCONNECTED'].includes(input.status)||typeof input.groupMessagingSupported!=='boolean')throw error('Diagnóstico do número inválido.');
  const groups=Array.isArray(input.groupIds)?[...new Set(input.groupIds.map(v=>String(v).trim()).filter(v=>v&&v.length<=200))].slice(0,500):[];
  if(connected&&input.groupMessagingSupported&&!groups.length)throw error('Informe os grupos que este número pode atender.');
  const result=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:"UPDATE whatsapp_connections SET last_verified_at=now(),group_messaging_supported=$4,verified_groups=$6,status=CASE WHEN $3 AND $4 AND status<>'PAUSED' THEN 'ACTIVE' WHEN NOT $3 THEN 'DEGRADED' WHEN NOT $4 THEN 'PAUSED' ELSE status END,failure_count=CASE WHEN $3 THEN 0 ELSE failure_count END WHERE id=$1 AND account_id=$2 AND phone_number=$5 AND status<>'ARCHIVED' RETURNING id,status",params:[id,accountId,connected,input.groupMessagingSupported,phone,JSON.stringify(connected?groups:[])]}
  ]);
  if(!result.results[1].rows.length)throw error('Número não pertence à conexão desta conta.',404);
  return {connectionId:id,verified:connected,groupMessagingSupported:input.groupMessagingSupported,status:result.results[1].rows[0].status};
}
