import { db } from 'hatchable';

const channels=new Set(['INSTAGRAM','MESSENGER','WHATSAPP']);
const clean=(v,n=300)=>String(v??'').trim().slice(0,n);

export function evaluateMessagingWindow({channel,promotional=false,consentRecorded=false,lastInteractionAt=null,approvedTemplate=false,paidMarketingMessage=false}){
  const normalized=clean(channel,20).toUpperCase();
  if(!channels.has(normalized))return {allowed:false,decision:'BLOCKED',reason:'Canal de mensagem não reconhecido'};
  const interaction=lastInteractionAt?new Date(lastInteractionAt):null;
  const inside24h=interaction&&Number.isFinite(interaction.getTime())&&Date.now()-interaction.getTime()>=0&&Date.now()-interaction.getTime()<=24*60*60*1000;
  if(inside24h)return {allowed:true,decision:'ALLOWED',reason:'Contato interagiu nas últimas 24 horas',inside24h:true};
  if(normalized==='WHATSAPP'&&approvedTemplate&&consentRecorded)return {allowed:true,decision:'ALLOWED',reason:'Template aprovado e consentimento registrado',inside24h:false};
  if(normalized==='MESSENGER'&&promotional&&paidMarketingMessage&&consentRecorded)return {allowed:true,decision:'ALLOWED',reason:'Mensagem de marketing autorizada e consentida',inside24h:false};
  return {allowed:false,decision:'BLOCKED',reason:promotional?'Promoção fora da janela de 24 horas sem autorização compatível':'Mensagem automática fora da janela de 24 horas',inside24h:false};
}

export async function recordComplianceEvent(accountId,input,result){
  await db.query('INSERT INTO messaging_compliance_events(id,account_id,channel,event_type,contact_hash,promotional,consent_recorded,last_interaction_at,decision,reason,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[
    crypto.randomUUID(),accountId,clean(input.channel,20).toUpperCase(),'SEND_ATTEMPT',clean(input.contactHash,128),Boolean(input.promotional),Boolean(input.consentRecorded),input.lastInteractionAt||null,result.decision,clean(result.reason,300),JSON.stringify({approvedTemplate:Boolean(input.approvedTemplate),paidMarketingMessage:Boolean(input.paidMarketingMessage)})
  ]);
}

export async function complianceReport(accountId,days=7){
  const period=Math.max(1,Math.min(90,Number(days)||7));
  const rows=(await db.query("SELECT channel,event_type AS \"eventType\",decision,reason,promotional,consent_recorded AS \"consentRecorded\",last_interaction_at AS \"lastInteractionAt\",created_at AS \"createdAt\" FROM messaging_compliance_events WHERE account_id=$1 AND created_at>=now()-($2::text||' days')::interval ORDER BY created_at DESC LIMIT 200",[accountId,period])).rows;
  const attempts=rows.filter(x=>x.eventType==='SEND_ATTEMPT'),blocked=attempts.filter(x=>x.decision==='BLOCKED'),allowed=attempts.filter(x=>x.decision==='ALLOWED');
  const byChannel=['INSTAGRAM','MESSENGER','WHATSAPP'].map(channel=>{const list=attempts.filter(x=>x.channel===channel),bad=list.filter(x=>x.decision==='BLOCKED');return {channel,attempts:list.length,blocked:bad.length,status:bad.length?'ATTENTION':'COMPLIANT'}});
  const publicPosts=Number((await db.query("SELECT count(*)::int AS count FROM social_posts WHERE account_id=$1 AND created_at>=now()-($2::text||' days')::interval",[accountId,period])).rows[0]?.count||0);
  const groupPosts=Number((await db.query("SELECT count(*)::int AS count FROM publications WHERE account_id=$1 AND created_at>=now()-($2::text||' days')::interval",[accountId,period])).rows[0]?.count||0);
  return {period,summary:{attempts:attempts.length,allowed:allowed.length,blocked:blocked.length,complianceRate:attempts.length?Math.round(allowed.length*100/attempts.length):100},byChannel,recent:rows.slice(0,50),excluded:{publicPosts,groupPosts},notice:'Posts públicos e mensagens em grupos não são tratados como DMs individuais neste relatório.'};
}

