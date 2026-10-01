import {db,scheduler} from 'hatchable';
import {configuredBotToken} from './telegram.js';
import {timeValue} from './validation.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function localParts(date,timezone='America/Sao_Paulo'){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date)).map(x=>[x.type,x.value]));
  return {day:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute,second:Number(parts.second)};
}
export function validDay(value){const s=String(value||'');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
function dayAdd(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function wallTime(day,time,timezone){
  const desired=Date.parse(day+'T'+time+':00Z');let instant=desired;
  for(let i=0;i<4;i++){const p=localParts(instant,timezone),seen=Date.parse(p.day+'T'+p.time+':'+String(p.second).padStart(2,'0')+'Z');instant+=desired-seen;}
  const actual=localParts(instant,timezone);
  return actual.day===day&&actual.time===time?new Date(instant):null;
}
export function nextOccurrence(row,after=new Date(),timezone='America/Sao_Paulo'){
  if(!timeValue(row.send_time)||!['DAILY','WEEKDAYS','WEEKLY','ONCE'].includes(row.recurrence))throw fail('Recorrência inválida.');
  const day=localParts(after,timezone).day;
  if(row.recurrence==='ONCE'){
    if(!validDay(row.once_date))return null;
    const candidate=wallTime(row.once_date,row.send_time,timezone);return candidate&&candidate>after?candidate:null;
  }
  for(let n=0;n<=8;n++){
    const date=dayAdd(day,n),weekday=new Date(date+'T12:00:00Z').getUTCDay();
    if(row.recurrence==='WEEKDAYS'&&(weekday===0||weekday===6)||row.recurrence==='WEEKLY'&&weekday!==Number(row.weekday))continue;
    const candidate=wallTime(date,row.send_time,timezone);if(candidate&&candidate>after)return candidate;
  }
  return null;
}
async function arm(row){
  if(!row.next_run_at)return;
  try{
    const task=await scheduler.at(new Date(row.next_run_at).toISOString(),'/api/jobs/recurrence',{name:'recurrence-'+row.id,payload:{scheduleId:row.id,accountId:row.account_id,runAt:new Date(row.next_run_at).toISOString()}});
    await db.query("UPDATE schedules SET scheduler_task_id=$3,last_error='' WHERE id=$1 AND account_id=$2 AND status='ACTIVE' AND next_run_at=$4",[row.id,row.account_id,String(task.id??task.task_id??''),row.next_run_at]);
  }catch{
    await db.query("UPDATE schedules SET scheduler_task_id=NULL,last_error='Agendamento temporariamente indisponível; recuperação horária ativa.' WHERE id=$1 AND account_id=$2",[row.id,row.account_id]);
  }
}
export async function setScheduleStatus(accountId,id,status){
  if(!['ACTIVE','PAUSED','ARCHIVED'].includes(status))throw fail('Estado da recorrência inválido.');
  const row=(await db.query("SELECT s.*,COALESCE(a.timezone,'America/Sao_Paulo') AS timezone,g.platform,g.status AS group_status,g.external_id FROM schedules s LEFT JOIN account_settings a ON a.account_id=s.account_id LEFT JOIN promo_groups g ON g.id=s.group_id AND g.account_id=s.account_id WHERE s.id=$1 AND s.account_id=$2 AND s.status<>'ARCHIVED'",[id,accountId])).rows[0];
  if(!row)throw fail('Recorrência não encontrada.',404);
  let next=null;
  if(status==='ACTIVE'){
    if(row.group_status!=='ACTIVE'||!row.external_id)throw fail('Configure e ative o destino desta recorrência.',412);
    if(row.platform==='WHATSAPP'){
      if(!(await db.query("SELECT id FROM whatsapp_connections WHERE account_id=$1 AND status='ACTIVE' AND group_messaging_supported AND verified_groups @> jsonb_build_array($2::text) AND last_verified_at>now()-interval '24 hours' LIMIT 1",[accountId,row.external_id])).rows.length)throw fail('Ative um número de WhatsApp validado pelo conector.',412);
    }else{
      const bots=(await db.query("SELECT secret_slot FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE'",[accountId])).rows;let usable=false;
      for(const bot of bots)try{await configuredBotToken(bot.secret_slot,accountId);usable=true;break;}catch{}
      if(!usable)throw fail('Conecte um bot autorizado desta conta antes de ativar a recorrência.',412);
    }
    next=nextOccurrence(row,new Date(Date.now()+2000),row.timezone);
    if(!next)throw fail('Escolha uma data futura válida para a mensagem.');
  }
  await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:'UPDATE schedules SET status=$3,next_run_at=$4,scheduler_task_id=NULL,last_error=$5 WHERE id=$1 AND account_id=$2',params:[id,accountId,status,next?.toISOString()||null,'']},
    {sql:"UPDATE publications SET status='CANCELLED',error_message='Recorrência pausada ou removida.' WHERE account_id=$1 AND schedule_id=$2 AND $3<>'ACTIVE' AND status IN ('READY','RETRY','SCHEDULED','WAITING_CONNECTION')",params:[accountId,id,status]}
  ]);
  if(row.scheduler_task_id)try{await scheduler.cancel(row.scheduler_task_id);}catch{}
  if(next)await arm({...row,next_run_at:next.toISOString()});
  return {status,nextRunAt:next?.toISOString()||null};
}
export async function runSchedule(accountId,id,expected=null){
  const row=(await db.query("SELECT s.*,COALESCE(a.timezone,'America/Sao_Paulo') AS timezone FROM schedules s LEFT JOIN account_settings a ON a.account_id=s.account_id WHERE s.id=$1 AND s.account_id=$2 AND s.status='ACTIVE'",[id,accountId])).rows[0];
  if(!row)return {queued:0};
  if(!row.next_run_at){const next=nextOccurrence(row,new Date(),row.timezone);if(next){await db.query("UPDATE schedules SET next_run_at=$3 WHERE id=$1 AND account_id=$2 AND next_run_at IS NULL",[id,accountId,next.toISOString()]);await arm({...row,next_run_at:next.toISOString()});}return {queued:0};}
  const due=new Date(row.next_run_at),now=new Date();
  if(expected&&new Date(expected).getTime()!==due.getTime())return {queued:0};
  if(due>now){if(!row.scheduler_task_id)await arm(row);return {queued:0};}
  const next=nextOccurrence(row,new Date(now.getTime()+2000),row.timezone),key='recurrence:'+id+':'+localParts(due,row.timezone).day;
  const result=await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:"INSERT INTO publications(id,account_id,offer_id,group_id,status,scheduled_at,message,mode,schedule_id,content_type,idempotency_key) SELECT $1,s.account_id,NULL,s.group_id,'READY',s.next_run_at,s.message,'RECURRENCE',s.id,'MESSAGE',$4 FROM schedules s JOIN accounts a ON a.id=s.account_id JOIN promo_groups g ON g.id=s.group_id AND g.account_id=s.account_id WHERE s.id=$2 AND s.account_id=$3 AND s.status='ACTIVE' AND a.status='ACTIVE' AND s.next_run_at=$5 AND s.next_run_at<=now() AND s.next_run_at>now()-interval '60 minutes' AND g.status='ACTIVE' AND NULLIF(trim(g.external_id),'') IS NOT NULL ON CONFLICT DO NOTHING RETURNING id",params:[crypto.randomUUID(),id,accountId,key,row.next_run_at]},
    {sql:"UPDATE schedules SET next_run_at=$4,status=CASE WHEN $4::timestamptz IS NULL THEN 'COMPLETED' ELSE status END,last_run_at=$3,scheduler_task_id=NULL WHERE id=$1 AND account_id=$2 AND status='ACTIVE' AND next_run_at=$3 RETURNING id",params:[id,accountId,row.next_run_at,next?.toISOString()||null]}
  ]);
  const queued=result.results[1].rows.length;
  if(result.results[2].rows.length&&next)await arm({...row,next_run_at:next.toISOString()});
  if(queued&&(await db.query("SELECT id FROM promo_groups WHERE id=$1 AND account_id=$2 AND platform='TELEGRAM'",[row.group_id,accountId])).rows.length)await scheduler.now('/api/jobs/telegram');
  return {queued,skipped:queued?0:1};
}
export async function recoverRecurrences(){
  const rows=(await db.query("SELECT id,account_id FROM schedules WHERE status='ACTIVE' AND (next_run_at IS NULL OR next_run_at<=now() OR scheduler_task_id IS NULL) ORDER BY next_run_at NULLS FIRST LIMIT 100")).rows;let queued=0;
  for(const row of rows)try{queued+=(await runSchedule(row.account_id,row.id)).queued;}catch{await db.query("UPDATE schedules SET last_error='Falha no processamento; nova verificação na recuperação horária.' WHERE id=$1 AND account_id=$2",[row.id,row.account_id]);}
  return {queued,checked:rows.length};
}
