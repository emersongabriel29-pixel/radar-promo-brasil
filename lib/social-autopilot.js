import { medicationProductSql } from './product-safety.js';
import { db, config } from 'hatchable';
import { generateGeminiText } from 'lib/gemini.js';
import { metaCall,metaToken } from 'lib/direct-connectors.js';
import { bindCredential } from './credential-bindings.js';
import {offerImage} from './offer-images.js';
import {formatPromo} from './promo-message.js';

const ORIGIN=process.env.public_app_url||'https://radar-promo-brasil.hatchable.site';
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const https=v=>{try{return new URL(String(v||'')).protocol==='https:'}catch{return false}};
const brl=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const discount=(c,o)=>Number(o)>Number(c)?Math.round((Number(o)-Number(c))*100/Number(o)):0;

async function hook(offer,channel){
  const fallback=clean(offer.title,70);
  try{
    const result=await generateGeminiText({purpose:'social-autopilot-hook',model:'gemini',maxTokens:80,system:'Reescreva o nome comercial do produto em português brasileiro, com no máximo 6 palavras e até 70 caracteres. Preserve marca, modelo e identidade quando presentes. Não invente características, benefícios ou compatibilidade. Não use emojis, preço, desconto, urgência nem chamadas promocionais. Retorne somente o nome curto.',prompt:'Canal: '+channel+'\nNome original: '+clean(offer.title,220)+'\nRetorne somente o nome comercial curto.',signal:AbortSignal.timeout(15000)});
    const text=clean(result.text,100).replace(/[\r\n]+/g,' ');
    return text&&!/R\$|%|https?:|cupom|frete|estoque|garantia|menor pre[cç]o|[uú]ltimas unidades|s[oó] hoje/i.test(text)?text.slice(0,70):fallback;
  }catch{return fallback}
}

async function caption(offer,channel,id){
  const shortTitle=await hook(offer,channel);
  const formatted=formatPromo({
    title:offer.title,shortTitle,source:offer.source,category:offer.category_name,
    currentPrice:Number(offer.current_price)||0,originalPrice:Number(offer.original_price)||0,
    affiliateUrl:offer.affiliate_url,couponCode:offer.coupon_code,couponUrl:offer.coupon_url
  });
  return (formatted.message+'\n\n#RadarPromoBrasil #Ofertas #Achadinhos #publicidade')
    .slice(0,channel==='INSTAGRAM'?2200:5000);
}

async function settings(accountId,{ensure=false}={}){
  if(ensure)await db.query('INSERT INTO social_autopilot_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',[accountId]);
  const row=(await db.query("SELECT *,CASE WHEN start_time=end_time THEN true WHEN start_time<end_time THEN (now() AT TIME ZONE timezone)::time BETWEEN start_time AND end_time ELSE (now() AT TIME ZONE timezone)::time>=start_time OR (now() AT TIME ZONE timezone)::time<=end_time END AS in_window FROM social_autopilot_settings WHERE account_id=$1",[accountId])).rows[0];
  if(row)return row;
  // Read-only snapshots must not write to the database just to render defaults.
  return {status:'PAUSED',auto_generate:true,require_approval:true,channels:['INSTAGRAM','FACEBOOK'],min_score:70,max_posts_per_day:6,interval_minutes:60,start_time:'08:00',end_time:'22:00',timezone:'America/Sao_Paulo',last_run_at:null,in_window:true};
}

export async function prepareSocialPosts(accountId,{limit=4,offerId='',imageJobId='',manual=false}={}){
  const s=await settings(accountId,{ensure:true}),channels=Array.isArray(s.channels)?s.channels:['INSTAGRAM','FACEBOOK'];
  if(s.status!=='ACTIVE'&&!offerId&&!manual)return {generated:0,reason:'PAUSED'};
  if(!s.auto_generate&&!manual)return {generated:0,reason:'AUTO_GENERATE_DISABLED'};
  if(!s.in_window&&!offerId)return {generated:0,reason:'OUTSIDE_WINDOW'};
  const remaining=Math.max(1,Math.min(20,Number(limit)||4));
  const art=imageJobId?(await db.query("SELECT id,storage_key FROM media_generation_jobs WHERE id=$1 AND account_id=$2 AND kind='IMAGE' AND status IN ('COMPLETED','FALLBACK_COMPLETED') AND storage_key IS NOT NULL",[imageJobId,accountId])).rows[0]:null;
  if(imageJobId&&!art)return {generated:0,reason:'IMAGE_NOT_READY'};
  const offers=(await db.query(`SELECT o.*,c.name AS category_name FROM offers o LEFT JOIN categories c ON c.id=o.category_id AND c.account_id=o.account_id WHERE o.account_id=$1 AND NOT ${medicationProductSql('o')} AND o.status IN ('APPROVED','READY') AND (o.image_storage_key IS NOT NULL OR o.image_url LIKE 'https://%') AND o.affiliate_url LIKE 'https://%' AND ($2='' OR o.id=$2) ORDER BY COALESCE(o.radar_score,o.score,0) DESC,o.created_at DESC LIMIT 20`,[accountId,offerId])).rows;
  let generated=0;
  for(const offer of offers){
    for(const channel of channels.filter(x=>['INSTAGRAM','FACEBOOK'].includes(x))){
      if(generated>=remaining)break;
      const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:s.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const id=crypto.randomUUID(),key='social:'+offer.id+':'+channel+':'+localDay+(art?':image:'+art.id:'');
      if((await db.query('SELECT id FROM social_posts WHERE account_id=$1 AND idempotency_key=$2',[accountId,key])).rows.length)continue;
      const active=(await db.query("SELECT id FROM social_connections WHERE account_id=$1 AND network=$2 AND status='ACTIVE'",[accountId,channel])).rows.length>0;
      const status=s.require_approval?'DRAFT':(active?'SCHEDULED':'BLOCKED');
      const scheduledAt=new Date(Date.now()+generated*Math.max(15,Number(s.interval_minutes))*60000).toISOString();
      const message=await caption(offer,channel,id);
      const imageUrl=art?ORIGIN+'/api/public/social-image/'+encodeURIComponent(id):offer.image_url;
      const transaction=await db.transaction([
        {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
        {sql: `INSERT INTO social_posts(id,account_id,offer_id,channel,message,image_url,affiliate_url,status,scheduled_at,idempotency_key,last_error,image_storage_key,image_job_id)
          SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
          WHERE EXISTS(SELECT 1 FROM accounts WHERE id=$2 AND status='ACTIVE')
          ON CONFLICT DO NOTHING RETURNING id`,params:[id,accountId,offer.id,channel,message,imageUrl,offer.affiliate_url,status,scheduledAt,key,status==='BLOCKED'?'Aguardando autorização Meta':'',art?.storage_key||offer.image_storage_key,art?.id||null]}
      ]);
      if(transaction.results[1].rows.length)generated++;
    }
    if(generated>=remaining)break;
  }
  await db.query('UPDATE social_autopilot_settings SET last_run_at=now(),updated_at=now() WHERE account_id=$1',[accountId]);
  return {generated,reason:generated?'OK':'NO_ELIGIBLE_OFFERS'};
}

async function meta(path,body){return metaCall('POST',path,body)}

export async function verifyMeta(accountId){
  const token=await metaToken(),page=String(await config.get('META_FACEBOOK_PAGE_ID')||''),instagram=String(await config.get('META_INSTAGRAM_ACCOUNT_ID')||'');
  if(!token)return {ok:false,error:'META_PAGE_ACCESS_TOKEN não configurado'};
  await bindCredential('META','PAGE',accountId);
  const result={ok:true,facebook:false,instagram:false};
  for(const [network,id,fields] of [['FACEBOOK',page,'id,name'],['INSTAGRAM',instagram,'id,username']]){
    if(!id)continue;
    try{
      const data=await metaCall('GET',encodeURIComponent(id)+'?fields='+encodeURIComponent(fields));
      await db.query("UPDATE social_connections SET status='ACTIVE',external_id=$3,display_name=COALESCE(NULLIF($4,''),display_name),last_error='',updated_at=now() WHERE account_id=$1 AND network=$2",[accountId,network,String(data.id),clean(data.name||data.username,140)]);
      result[network.toLowerCase()]=true;
    }catch(e){result.ok=false;result[network.toLowerCase()+'Error']=clean(e.message,300);await db.query("UPDATE social_connections SET status='ERROR',last_error=$3,updated_at=now() WHERE account_id=$1 AND network=$2",[accountId,network,clean(e.message,300)])}
  }
  return result;
}

export async function dispatchSocialPosts(accountId='',limit=10){
  await db.query("UPDATE social_posts SET status='WAITING_CONFIRMATION',last_error='Entrega incerta. Confira o destino antes de reenviar.',updated_at=now() WHERE ($1='' OR account_id=$1) AND status='PUBLISHING' AND updated_at<now()-interval '20 minutes'",[accountId]);
  if(accountId)await db.query("UPDATE social_posts p SET status='SCHEDULED',last_error='',updated_at=now() WHERE p.account_id=$1 AND p.status='BLOCKED' AND EXISTS(SELECT 1 FROM social_connections s WHERE s.account_id=p.account_id AND s.network=p.channel AND s.status='ACTIVE')",[accountId]);
  const rows=(await db.query("SELECT sp.*,o.affiliate_url AS offer_affiliate_url FROM social_posts sp JOIN offers o ON o.id=sp.offer_id AND o.account_id=sp.account_id WHERE ($1='' OR sp.account_id=$1) AND sp.status IN ('READY','SCHEDULED','RETRY') AND COALESCE(scheduled_at,now())<=now() AND (next_attempt_at IS NULL OR next_attempt_at<=now()) ORDER BY scheduled_at NULLS FIRST,created_at LIMIT $2",[accountId,Math.max(1,Math.min(20,Number(limit)||10))])).rows;
  let published=0,blocked=0,failed=0;
  for(const post of rows){
    const s=await settings(post.account_id);
    if(s.status!=='ACTIVE'||!s.in_window)continue;
    if((await db.query("SELECT id FROM social_posts WHERE account_id=$1 AND status='PUBLISHED' AND published_at>now()-($2::text||' minutes')::interval",[post.account_id,s.interval_minutes])).rows.length)continue;
    const transaction=await db.transaction([
      {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[post.account_id]},
      {sql:`UPDATE social_posts p SET status='PUBLISHING',attempts=attempts+1,updated_at=now() WHERE id=$1 AND account_id=$2 AND status IN ('READY','SCHEDULED','RETRY') AND EXISTS(SELECT 1 FROM offers o WHERE o.id=p.offer_id AND o.account_id=p.account_id AND NOT ${medicationProductSql('o')}) AND EXISTS(SELECT 1 FROM accounts WHERE id=$2 AND status='ACTIVE') AND NOT EXISTS(SELECT 1 FROM social_posts other WHERE other.account_id=p.account_id AND (other.status='PUBLISHING' OR (other.status='PUBLISHED' AND other.published_at>now()-($3::text||' minutes')::interval))) RETURNING id`,params:[post.id,post.account_id,s.interval_minutes]}
    ]);
    if(!transaction.results[1].rows.length)continue;
    let providerAccepted=false;
    try{
      const connection=(await db.query("SELECT id FROM social_connections WHERE account_id=$1 AND network=$2 AND status='ACTIVE'",[post.account_id,post.channel])).rows[0];
      const token=await metaToken(post.account_id),page=String(await config.get('META_FACEBOOK_PAGE_ID')||''),instagram=String(await config.get('META_INSTAGRAM_ACCOUNT_ID')||'');
      if(!connection||!token||(post.channel==='FACEBOOK'&&!page)||(post.channel==='INSTAGRAM'&&!instagram)){
        await db.query("UPDATE social_posts SET status='BLOCKED',last_error='Aguardando autorização Meta',updated_at=now() WHERE id=$1",[post.id]);blocked++;continue;
      }
      let external;
      const imageUrl=post.image_job_id?post.image_url:new URL(await offerImage(post),ORIGIN).toString(),affiliateLink=String(post.offer_affiliate_url||'').trim(),outgoingMessage=String(post.message||'').replace(/https?:\/\/[^\s]+\/api\/r\/[0-9a-f-]+/gi,affiliateLink);
      if(post.channel==='FACEBOOK')external=await meta(encodeURIComponent(page)+'/photos',{url:imageUrl,message:outgoingMessage,published:true},token);
      else{const container=await meta(encodeURIComponent(instagram)+'/media',{image_url:imageUrl,caption:outgoingMessage},token);external=await meta(encodeURIComponent(instagram)+'/media_publish',{creation_id:container.id},token)}
      providerAccepted=true;
      await db.query("UPDATE social_posts SET status='PUBLISHED',published_at=now(),external_id=$2,last_error='',updated_at=now() WHERE id=$1",[post.id,clean(external.id,200)]);published++;
    }catch(e){const next=providerAccepted||e.code==='DELIVERY_UNCONFIRMED'?'WAITING_CONFIRMATION':'RETRY';await db.query("UPDATE social_posts SET status=$2,last_error=$3,next_attempt_at=now()+interval '30 minutes',updated_at=now() WHERE id=$1",[post.id,next,clean(e.message,300)]);failed++;}
  }
  return {processed:rows.length,published,blocked,failed};
}

export async function socialSnapshot(accountId){
  const s=await settings(accountId),posts=(await db.query("SELECT sp.id,sp.offer_id AS \"offerId\",sp.channel,sp.message,CASE WHEN sp.image_job_id IS NOT NULL THEN '/api/ai/media/file/'||sp.image_job_id ELSE sp.image_url END AS \"imageUrl\",sp.status,sp.scheduled_at AS \"scheduledAt\",sp.published_at AS \"publishedAt\",sp.clicks,sp.attempts,sp.last_error AS \"lastError\",sp.created_at AS \"createdAt\",o.title FROM social_posts sp JOIN offers o ON o.id=sp.offer_id AND o.account_id=sp.account_id WHERE sp.account_id=$1 ORDER BY sp.created_at DESC LIMIT 100",[accountId])).rows;
  const counts={};for(const p of posts)counts[p.status]=(counts[p.status]||0)+1;
  const connections=(await db.query("SELECT network,status,display_name AS \"displayName\",last_error AS \"lastError\" FROM social_connections WHERE account_id=$1 AND network IN ('INSTAGRAM','FACEBOOK') ORDER BY network",[accountId])).rows;
  return {settings:{status:s.status,autoGenerate:s.auto_generate,requireApproval:s.require_approval,channels:s.channels,minScore:s.min_score,maxPostsPerDay:s.max_posts_per_day,intervalMinutes:s.interval_minutes,startTime:String(s.start_time).slice(0,5),endTime:String(s.end_time).slice(0,5),timezone:s.timezone,lastRunAt:s.last_run_at},posts,counts,connections};
}