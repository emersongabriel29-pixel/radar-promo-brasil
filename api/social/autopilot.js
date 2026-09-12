import { db, scheduler } from 'hatchable';
import { prepareSocialPosts,dispatchSocialPosts,verifyMeta,socialSnapshot } from 'lib/social-autopilot.js';

export const access='member';
export const methods=['GET','POST','PUT','DELETE'];
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
async function account(member){return (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(member.id)])).rows[0]}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const a=await account(req.member);if(!a)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  try{
    if(req.method==='GET')return res.json({ok:true,...await socialSnapshot(a.id)});
    const b=req.body||{},action=clean(b.action,40).toUpperCase();
    if(req.method==='POST'&&action==='GENERATE')return res.json({ok:true,...await prepareSocialPosts(a.id,{limit:b.limit||4,offerId:clean(b.offerId,100)}),...await socialSnapshot(a.id)});
    if(req.method==='POST'&&action==='RUN'){const result=await dispatchSocialPosts(a.id,10);return res.json({ok:true,...result,...await socialSnapshot(a.id)})}
    if(req.method==='POST'&&action==='TEST_META')return res.json({...await verifyMeta(a.id),...await socialSnapshot(a.id)});
    if(req.method==='PUT'&&action==='SETTINGS'){
      const channels=(Array.isArray(b.channels)?b.channels:[]).filter(x=>['INSTAGRAM','FACEBOOK'].includes(x));if(!channels.length)return res.status(400).json({error:'Escolha pelo menos uma rede.'});
      await db.query("INSERT INTO social_autopilot_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING",[a.id]);
      await db.query('UPDATE social_autopilot_settings SET status=$2,auto_generate=$3,require_approval=$4,channels=$5,min_score=$6,max_posts_per_day=$7,interval_minutes=$8,start_time=$9,end_time=$10,updated_at=now() WHERE account_id=$1',[a.id,b.status==='ACTIVE'?'ACTIVE':'PAUSED',b.autoGenerate!==false,b.requireApproval!==false,JSON.stringify(channels),Math.max(0,Math.min(100,Number(b.minScore)||70)),Math.max(1,Math.min(50,Number(b.maxPostsPerDay)||6)),Math.max(15,Math.min(1440,Number(b.intervalMinutes)||60)),clean(b.startTime,5)||'08:00',clean(b.endTime,5)||'22:00']);
      if(b.status==='ACTIVE')await scheduler.now('/api/jobs/social');return res.json({ok:true,...await socialSnapshot(a.id)});
    }
    if(req.method==='PUT'&&['APPROVE','RETRY'].includes(action)){
      const status=action==='APPROVE'?'SCHEDULED':'READY',changed=await db.query("UPDATE social_posts SET status=$1,scheduled_at=COALESCE(scheduled_at,now()),next_attempt_at=NULL,last_error='',updated_at=now() WHERE id=$2 AND account_id=$3 AND status IN ('DRAFT','FAILED','BLOCKED') RETURNING id",[status,clean(b.id,100),a.id]);
      if(!changed.rows.length)return res.status(404).json({error:'Publicação não encontrada ou estado inválido.'});await scheduler.now('/api/jobs/social');return res.json({ok:true,...await socialSnapshot(a.id)});
    }
    if(req.method==='DELETE'){
      const removed=await db.query("DELETE FROM social_posts WHERE id=$1 AND account_id=$2 AND status<>'PUBLISHED' RETURNING id",[clean(req.query.id,100),a.id]);if(!removed.rows.length)return res.status(404).json({error:'Rascunho não encontrado ou já publicado.'});return res.json({ok:true,...await socialSnapshot(a.id)});
    }
    return res.status(400).json({error:'Ação inválida.'});
  }catch(e){console.error('social/autopilot',e);return res.status(500).json({error:'Não foi possível concluir o piloto automático social.'})}
}

