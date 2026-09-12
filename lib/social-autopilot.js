import { ai, db } from 'hatchable';

const ORIGIN=process.env.public_app_url||'https://radar-promo-brasil.hatchable.site';
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const https=v=>{try{return new URL(String(v||'')).protocol==='https:'}catch{return false}};
const brl=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const discount=(c,o)=>Number(o)>Number(c)?Math.round((Number(o)-Number(c))*100/Number(o)):0;

async function hook(offer,channel){
  const fallback=channel==='INSTAGRAM'?'🚨 Achadinho novo no radar!':'🔥 Encontramos uma oferta que merece atenção!';
  try{
    const result=await ai.generateText({purpose:'social-autopilot-hook',model:'gemini',maxTokens:80,system:'Crie somente uma chamada curta em português, com até 9 palavras, para uma publicação de oferta. Não mencione ou invente preço, desconto, cupom, frete, estoque, prazo, garantia, avaliação, urgência falsa ou link.',prompt:'Canal: '+channel+'\nProduto: '+clean(offer.title,220),signal:AbortSignal.timeout(15000)});
    const text=clean(result.text,100).replace(/[\r\n]+/g,' ');
    return text&&!/R\$|%|https?:|cupom|frete|estoque|garantia|menor pre[cç]o|[uú]ltimas unidades|s[oó] hoje/i.test(text)?text:fallback;
  }catch{return fallback}
}

async function caption(offer,channel,id){
  const lines=[await hook(offer,channel),'','💗 '+clean(offer.title,220)];
  const off=discount(offer.current_price,offer.original_price);
  if(off)lines.push('🏷️ '+off+'% OFF');
  if(Number(offer.original_price)>Number(offer.current_price))lines.push('De: '+brl(offer.original_price));
  lines.push('POR: '+brl(offer.current_price)+' ✅');
  if(clean(offer.coupon_code,100))lines.push('','🎟️ Cupom: '+clean(offer.coupon_code,100));
  lines.push('','🔗 Confira a oferta: '+ORIGIN+'/api/r/'+encodeURIComponent(id),'','ℹ️ Link de afiliado. Preço, estoque e condições podem mudar.','#RadarPromoBrasil #Ofertas #Achadinhos #publicidade');
  return lines.join('\n').slice(0,channel==='INSTAGRAM'?2200:5000);
}

async function settings(accountId){
  await db.query('INSERT INTO social_autopilot_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',[accountId]);
  return (await db.query("SELECT *,((now() AT TIME ZONE timezone)::time BETWEEN start_time AND end_time) AS in_window FROM social_autopilot_settings WHERE account_id=$1",[accountId])).rows[0];
}

export async function prepareSocialPosts(accountId,{limit=4,offerId=''}={}){
  const s=await settings(accountId),channels=Array.isArray(s.channels)?s.channels:['INSTAGRAM','FACEBOOK'];
  if(s.status!=='ACTIVE'&&!offerId)return {generated:0,reason:'PAUSED'};
  if(!s.in_window&&!offerId)return {generated:0,reason:'OUTSIDE_WINDOW'};
  const today=Number((await db.query("SELECT count(*)::int AS count FROM social_posts WHERE account_id=$1 AND created_at>=(date_trunc('day',now() AT TIME ZONE $2) AT TIME ZONE $2)",[accountId,s.timezone])).rows[0]?.count||0);
  const remaining=Math.max(0,Math.min(Number(limit)||4,Number(s.max_posts_per_day)-today));
  if(!remaining)return {generated:0,reason:'DAILY_LIMIT'};
  const offers=(await db.query("SELECT o.*,c.name AS category_name FROM offers o LEFT JOIN categories c ON c.id=o.category_id AND c.account_id=o.account_id WHERE o.account_id=$1 AND o.status IN ('APPROVED','READY') AND o.score>=$2 AND o.image_url LIKE 'https://%' AND o.affiliate_url LIKE 'https://%' AND ($3='' OR o.id=$3) ORDER BY COALESCE(o.radar_score,o.score,0) DESC,o.created_at DESC LIMIT 20",[accountId,Number(s.min_score)||70,offerId])).rows;
  let generated=0;
  for(const offer of offers){
    for(const channel of channels.filter(x=>['INSTAGRAM','FACEBOOK'].includes(x))){
      if(generated>=remaining)break;
      const id=crypto.randomUUID(),key='social:'+offer.id+':'+channel+':'+new Date().toISOString().slice(0,10);
      if((await db.query('SELECT id FROM social_posts WHERE account_id=$1 AND idempotency_key=$2',[accountId,key])).rows.length)continue;
      const active=(await db.query("SELECT id FROM social_connections WHERE account_id=$1 AND network=$2 AND status='ACTIVE'",[accountId,channel])).rows.length>0;
      const status=s.require_approval?'DRAFT':(active?'SCHEDULED':'BLOCKED');
      const scheduledAt=new Date(Date.now()+generated*Math.max(15,Number(s.interval_minutes))*60000).toISOString();
      const message=await caption(offer,channel,id);
      await db.query('INSERT INTO social_posts(id,account_id,offer_id,channel,message,image_url,affiliate_url,status,scheduled_at,idempotency_key,last_error) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,accountId,offer.id,channel,message,offer.image_url,offer.affiliate_url,status,scheduledAt,key,status==='BLOCKED'?'Aguardando autorização Meta':'']);
      generated++;
    }
    if(generated>=remaining)break;
  }
  await db.query('UPDATE social_autopilot_settings SET last_run_at=now(),updated_at=now() WHERE account_id=$1',[accountId]);
  return {generated,reason:generated?'OK':'NO_ELIGIBLE_OFFERS'};
}

async function meta(path,body,token){
  const response=await fetch('https://graph.facebook.com/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,access_token:token}),signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.error)throw new Error(clean(data.error?.message||'Falha na Meta',300));
  return data;
}

export async function verifyMeta(accountId){
  const token=process.env.META_PAGE_ACCESS_TOKEN,page=process.env.META_FACEBOOK_PAGE_ID,instagram=process.env.META_INSTAGRAM_ACCOUNT_ID;
  if(!token)return {ok:false,error:'META_PAGE_ACCESS_TOKEN não configurado'};
  const result={ok:true,facebook:false,instagram:false};
  for(const [network,id,fields] of [['FACEBOOK',page,'id,name'],['INSTAGRAM',instagram,'id,username']]){
    if(!id)continue;
    try{
      const response=await fetch('https://graph.facebook.com/'+encodeURIComponent(id)+'?fields='+encodeURIComponent(fields)+'&access_token='+encodeURIComponent(token),{signal:AbortSignal.timeout(20000)}),data=await response.json();
      if(!response.ok||data.error)throw new Error(clean(data.error?.message||'Falha na autorização',300));
      await db.query("UPDATE social_connections SET status='ACTIVE',external_id=$3,display_name=COALESCE(NULLIF($4,''),display_name),last_error='',updated_at=now() WHERE account_id=$1 AND network=$2",[accountId,network,String(data.id),clean(data.name||data.username,140)]);
      result[network.toLowerCase()]=true;
    }catch(e){result.ok=false;result[network.toLowerCase()+'Error']=clean(e.message,300);await db.query("UPDATE social_connections SET status='ERROR',last_error=$3,updated_at=now() WHERE account_id=$1 AND network=$2",[accountId,network,clean(e.message,300)])}
  }
  return result;
}

export async function dispatchSocialPosts(accountId='',limit=10){
  await db.query("UPDATE social_posts SET status='RETRY',next_attempt_at=now(),last_error='Publicação recuperada após interrupção',updated_at=now() WHERE ($1='' OR account_id=$1) AND status='PUBLISHING' AND updated_at<now()-interval '20 minutes'",[accountId]);
  if(accountId)await db.query("UPDATE social_posts p SET status='SCHEDULED',last_error='',updated_at=now() WHERE p.account_id=$1 AND p.status='BLOCKED' AND EXISTS(SELECT 1 FROM social_connections s WHERE s.account_id=p.account_id AND s.network=p.channel AND s.status='ACTIVE')",[accountId]);
  const rows=(await db.query("SELECT * FROM social_posts WHERE ($1='' OR account_id=$1) AND status IN ('READY','SCHEDULED','RETRY') AND COALESCE(scheduled_at,now())<=now() AND (next_attempt_at IS NULL OR next_attempt_at<=now()) ORDER BY scheduled_at NULLS FIRST,created_at LIMIT $2",[accountId,Math.max(1,Math.min(20,Number(limit)||10))])).rows;
  let published=0,blocked=0,failed=0;
  for(const post of rows){
    const claimed=(await db.query("UPDATE social_posts SET status='PUBLISHING',attempts=attempts+1,updated_at=now() WHERE id=$1 AND account_id=$2 AND status IN ('READY','SCHEDULED','RETRY') RETURNING id",[post.id,post.account_id])).rows[0];if(!claimed)continue;
    try{
      const connection=(await db.query("SELECT id FROM social_connections WHERE account_id=$1 AND network=$2 AND status='ACTIVE'",[post.account_id,post.channel])).rows[0];
      const token=process.env.META_PAGE_ACCESS_TOKEN,page=process.env.META_FACEBOOK_PAGE_ID,instagram=process.env.META_INSTAGRAM_ACCOUNT_ID;
      if(!connection||!token||(post.channel==='FACEBOOK'&&!page)||(post.channel==='INSTAGRAM'&&!instagram)){
        await db.query("UPDATE social_posts SET status='BLOCKED',last_error='Aguardando autorização Meta',updated_at=now() WHERE id=$1",[post.id]);blocked++;continue;
      }
      let external;
      if(post.channel==='FACEBOOK')external=await meta(encodeURIComponent(page)+'/photos',{url:post.image_url,message:post.message,published:true},token);
      else{const container=await meta(encodeURIComponent(instagram)+'/media',{image_url:post.image_url,caption:post.message},token);external=await meta(encodeURIComponent(instagram)+'/media_publish',{creation_id:container.id},token)}
      await db.query("UPDATE social_posts SET status='PUBLISHED',published_at=now(),external_id=$2,last_error='',updated_at=now() WHERE id=$1",[post.id,clean(external.id,200)]);published++;
    }catch(e){const next=Number(post.attempts||0)+1<3?'RETRY':'FAILED';await db.query("UPDATE social_posts SET status=$2,last_error=$3,next_attempt_at=now()+interval '30 minutes',updated_at=now() WHERE id=$1",[post.id,next,clean(e.message,300)]);failed++;}
  }
  return {processed:rows.length,published,blocked,failed};
}

export async function socialSnapshot(accountId){
  const s=await settings(accountId),posts=(await db.query('SELECT sp.id,sp.offer_id AS "offerId",sp.channel,sp.message,sp.image_url AS "imageUrl",sp.status,sp.scheduled_at AS "scheduledAt",sp.published_at AS "publishedAt",sp.clicks,sp.attempts,sp.last_error AS "lastError",sp.created_at AS "createdAt",o.title FROM social_posts sp JOIN offers o ON o.id=sp.offer_id AND o.account_id=sp.account_id WHERE sp.account_id=$1 ORDER BY sp.created_at DESC LIMIT 100',[accountId])).rows;
  const counts={};for(const p of posts)counts[p.status]=(counts[p.status]||0)+1;
  const connections=(await db.query("SELECT network,status,display_name AS \"displayName\",last_error AS \"lastError\" FROM social_connections WHERE account_id=$1 AND network IN ('INSTAGRAM','FACEBOOK') ORDER BY network",[accountId])).rows;
  return {settings:{status:s.status,autoGenerate:s.auto_generate,requireApproval:s.require_approval,channels:s.channels,minScore:s.min_score,maxPostsPerDay:s.max_posts_per_day,intervalMinutes:s.interval_minutes,startTime:String(s.start_time).slice(0,5),endTime:String(s.end_time).slice(0,5),timezone:s.timezone,lastRunAt:s.last_run_at},posts,counts,connections};
}
