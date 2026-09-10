import { db } from 'hatchable';
import { configuredBotToken,inspectBot } from 'lib/telegram.js';

export const access='member';
export const methods=['GET','POST','PUT'];
const id=()=>crypto.randomUUID();
const text=(v,n=500)=>String(v??'').trim().slice(0,n);
const slugify=v=>text(v,80).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'operacao';

async function account(member){
  const memberId=String(member.id);
  let found=(await db.query('SELECT * FROM accounts WHERE owner_member_id=$1',[memberId])).rows[0];
  if(found)return found;
  const base=slugify(member.display_name||member.handle||'operacao'),slug=base+'-'+memberId.slice(-6).toLowerCase();
  found=(await db.query('INSERT INTO accounts(id,owner_member_id,name,slug) VALUES($1,$2,$3,$4) RETURNING *',[id(),memberId,text(member.display_name||'Minha operação',100),slug])).rows[0];
  await db.query('INSERT INTO storefront_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',[found.id]);
  await db.query('INSERT INTO account_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',[found.id]);
  for(const store of ['AMAZON','SHOPEE','MERCADO_LIVRE'])await db.query('INSERT INTO marketplace_rules(id,account_id,marketplace) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id(),found.id,store]);
  return found;
}

async function snapshot(a){
  const q=await Promise.all([
    db.query('SELECT marketplace,affiliate_tag AS "affiliateTag",subid_template AS "subidTemplate",conversion_endpoint AS "conversionEndpoint",status FROM marketplace_rules WHERE account_id=$1 ORDER BY marketplace',[a.id]),
    db.query('SELECT id,name,provider,external_id AS "externalId",priority,status,last_seen_at AS "lastSeenAt",failure_count AS "failureCount" FROM whatsapp_connections WHERE account_id=$1 ORDER BY priority,name',[a.id]),
    db.query('SELECT * FROM storefront_settings WHERE account_id=$1',[a.id]),
    db.query('SELECT network,status,external_id AS "externalId" FROM social_connections WHERE account_id=$1 ORDER BY network',[a.id]),
    db.query('SELECT plan,status,current_period_end AS "currentPeriodEnd" FROM subscriptions WHERE account_id=$1 ORDER BY created_at DESC LIMIT 1',[a.id]),
    db.query("SELECT count(DISTINCT phone_hash)::int AS unique_leads,count(*) FILTER(WHERE event_type='JOIN')::int AS joins,count(*) FILTER(WHERE event_type='LEAVE')::int AS leaves FROM lead_events WHERE account_id=$1 AND occurred_at>now()-interval '30 days'",[a.id]),
    db.query('SELECT id,name,bot_id AS "botId",bot_username AS "botUsername",secret_slot AS "secretSlot",priority,status,last_seen_at AS "lastSeenAt",failure_count AS "failureCount" FROM telegram_connections WHERE account_id=$1 ORDER BY priority,name',[a.id])
  ]);
  return {account:{id:a.id,name:a.name,slug:a.slug,plan:a.plan,status:a.status,trialEndsAt:a.trial_ends_at},marketplaces:q[0].rows,connections:q[1].rows,storefront:q[2].rows[0]||{},social:q[3].rows,subscription:q[4].rows[0]||null,leads:q[5].rows[0],telegramConnections:q[6].rows};
}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para continuar.'});
  try{
    const a=await account(req.member),b=req.body||{};
    if(req.method==='GET')return res.json(await snapshot(a));
    if(req.method==='POST'&&b.entity==='connection'){
      await db.query('INSERT INTO whatsapp_connections(id,account_id,name,provider,external_id,priority,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[id(),a.id,text(b.name,100),text(b.provider,30)||'N8N',text(b.externalId,200),Math.max(1,Number(b.priority)||100),'PAUSED']);
    }else if(req.method==='POST'&&b.entity==='telegramConnection'){
      const slot=Math.max(1,Math.min(3,Number(b.secretSlot)||1)),token=await configuredBotToken(slot),bot=await inspectBot(token),priority=Math.max(1,Math.min(9999,Number(b.priority)||100));
      await db.query("INSERT INTO telegram_connections(id,account_id,name,bot_id,bot_username,secret_slot,priority,status,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$7,'ACTIVE',now()) ON CONFLICT(account_id,secret_slot) DO UPDATE SET name=EXCLUDED.name,bot_id=EXCLUDED.bot_id,bot_username=EXCLUDED.bot_username,priority=EXCLUDED.priority,status='ACTIVE',failure_count=0,last_seen_at=now(),updated_at=now()",[id(),a.id,text(b.name,100)||('@'+(bot.username||bot.id)),String(bot.id),text(bot.username,100),slot,priority]);
    }else if(req.method==='PUT'&&b.entity==='marketplace'){
      if(!['AMAZON','SHOPEE','MERCADO_LIVRE'].includes(b.marketplace))return res.status(400).json({error:'Loja inválida.'});
      await db.query('UPDATE marketplace_rules SET affiliate_tag=$1,subid_template=$2,conversion_endpoint=$3,status=$4,updated_at=now() WHERE account_id=$5 AND marketplace=$6',[text(b.affiliateTag,200),text(b.subidTemplate,200)||'{group}',text(b.conversionEndpoint,1000),text(b.status,20)||'PENDING',a.id,b.marketplace]);
    }else if(req.method==='PUT'&&b.entity==='storefront'){
      await db.query('UPDATE storefront_settings SET title=$1,description=$2,primary_color=$3,published=$4,updated_at=now() WHERE account_id=$5',[text(b.title,120),text(b.description,500),text(b.primaryColor,10)||'#ff6a2a',Boolean(b.published),a.id]);
    }else if(req.method==='PUT'&&b.entity==='account'){
      await db.query('UPDATE accounts SET name=$1,updated_at=now() WHERE id=$2',[text(b.name,100),a.id]);
    }else if(req.method==='PUT'&&b.entity==='telegramConnection'){
      const status=text(b.status,20);if(!['ACTIVE','PAUSED'].includes(status))return res.status(400).json({error:'Status inválido.'});
      const changed=await db.query('UPDATE telegram_connections SET status=$1,updated_at=now() WHERE id=$2 AND account_id=$3 RETURNING id',[status,text(b.id,100),a.id]);
      if(!changed.rows.length)return res.status(404).json({error:'Conexão não encontrada.'});
    }else return res.status(400).json({error:'Ação inválida.'});
    return res.json({ok:true,...await snapshot(a)});
  }catch(e){return res.status(500).json({error:e?.message||'Falha na configuração.'})}
}
