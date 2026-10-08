import { db,scheduler } from 'hatchable';
import { getOrCreateAccount as getAccount,starter } from 'lib/accounts.js';
import { moneyCents,timeValue,colorValue,booleanValue,httpsUrl,mediaUrl } from 'lib/validation.js';
import { fingerprint as makeFingerprint } from 'lib/automation.js';
import { formatPromo } from 'lib/promo-message.js';
import { hydrateImages } from 'lib/offer-images.js';
import {setScheduleStatus,validDay} from 'lib/recurrences.js';
import {canActivateMonitor} from 'lib/monitoring.js';

export const access='member';
export const methods=['GET','POST','PUT','DELETE'];

const uid=()=>crypto.randomUUID(),txt=(v,n=500)=>String(v??'').trim().slice(0,n),cents=v=>moneyCents(v);
const STORES=['AMAZON','SHOPEE','MERCADO_LIVRE','SHEIN','ALIEXPRESS','MAGALU','CASAS_BAHIA','HOTMART','KABUM','AMERICANAS','NATURA','AVON'];
const url=v=>Boolean(httpsUrl(v));
const cash=v=>(Number(v||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percent=(c,o)=>o>c?Math.round((o-c)*100/o):0;
const score=(t,c,o)=>Math.max(35,Math.min(98,45+percent(c,o)+(/iphone|samsung|air fryer|fralda|notebook|tv|playstation|perfume/i.test(t)?18:8)));
const slugify=v=>txt(v,80).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'operacao';

async function belongs(table,id,accountId){return Boolean((await db.query('SELECT id FROM '+table+' WHERE id=$1 AND account_id=$2',[id,accountId])).rows.length)}
async function categoryOk(id,a){return !id||belongs('categories',id,a)}

async function all(a){
  await starter(a.id);
  const q=await Promise.all([
    db.query('SELECT id,name,icon,color,created_at AS "createdAt" FROM categories WHERE account_id=$1 ORDER BY name',[a.id]),
    db.query('SELECT id,name,platform,whatsapp_destination_type AS "destinationType",category_id AS "categoryId",invite_url AS "inviteUrl",members,status,external_id AS "externalId",capacity,joined_24h AS "joined24h",left_24h AS "left24h",marketplace_subids AS "marketplaceSubids",created_at AS "createdAt" FROM promo_groups WHERE account_id=$1 ORDER BY platform,name',[a.id]),
    db.query('SELECT id,title,source,original_price AS "originalPrice",current_price AS "currentPrice",category_id AS "categoryId",affiliate_url AS "affiliateUrl",image_url AS "imageUrl",image_storage_key AS "imageStorageKey",product_url AS "productUrl",coupon_url AS "couponUrl",coupon_code AS "couponCode",discount_percent AS "discountPercent",score,status,message,fingerprint,validation_status AS "validationStatus",imported_by AS "importedBy",storefront_visible AS "storefrontVisible",detected_at AS "detectedAt",created_at AS "createdAt" FROM offers WHERE account_id=$1 ORDER BY created_at DESC LIMIT 250',[a.id]),
    db.query('SELECT id,offer_id AS "offerId",group_id AS "groupId",content_type AS "contentType",schedule_id AS "scheduleId",status,scheduled_at AS "scheduledAt",published_at AS "publishedAt",clicks,message,image_url AS "imageUrl",image_storage_key AS "imageStorageKey",mode,attempts,error_message AS "errorMessage",priority,mention_all AS "mentionAll",connection_id AS "connectionId",created_at AS "createdAt" FROM publications WHERE account_id=$1 ORDER BY priority DESC,created_at DESC LIMIT 250',[a.id]),
    db.query('SELECT id,name,source_type AS "sourceType",source_url AS "sourceUrl",source_authorized AS "sourceAuthorized",affiliate_url AS "affiliateUrl",last_error AS "lastError",category_id AS "categoryId",mode,status,captured_count AS "capturedCount",last_run_at AS "lastRunAt",created_at AS "createdAt" FROM monitors WHERE account_id=$1 AND status<>\'ARCHIVED\' ORDER BY created_at DESC',[a.id]),
    db.query('SELECT id,name,category_id AS "categoryId",start_time AS "startTime",end_time AS "endTime",interval_minutes AS "intervalMinutes",priority_mode AS "priorityMode",mention_all AS "mentionAll",link_preview AS "linkPreview",status,created_at AS "createdAt" FROM queues WHERE account_id=$1 ORDER BY created_at DESC',[a.id]),
    db.query("SELECT id,name,message,group_id AS \"groupId\",recurrence,send_time AS \"sendTime\",weekday,once_date AS \"onceDate\",next_run_at AS \"nextRunAt\",last_error AS \"lastError\",status,last_run_at AS \"lastRunAt\",created_at AS \"createdAt\" FROM schedules WHERE account_id=$1 AND status<>'ARCHIVED' ORDER BY created_at DESC",[a.id]),
    db.query("SELECT group_id AS \"groupId\",count(*) FILTER(WHERE event_type='JOIN')::int AS joined,count(*) FILTER(WHERE event_type='LEAVE')::int AS left,count(DISTINCT phone_hash)::int AS unique_leads FROM lead_events WHERE account_id=$1 AND occurred_at>now()-interval '30 days' GROUP BY group_id",[a.id]),
    db.query('SELECT id,event_type AS "eventType",title,details,status,created_at AS "createdAt" FROM activity_log WHERE account_id=$1 ORDER BY created_at DESC LIMIT 20',[a.id]),
    db.query('SELECT name,status,details,last_checked_at AS "lastCheckedAt" FROM account_integration_health WHERE account_id=$1 ORDER BY name',[a.id]),
    db.query('SELECT auto_approve AS "autoApprove",minimum_score AS "minimumScore",maximum_batch AS "maximumBatch",require_image AS "requireImage",require_affiliate_link AS "requireAffiliateLink",timezone FROM account_settings WHERE account_id=$1',[a.id])
  ]);
  const offers=await hydrateImages(q[2].rows),publications=await hydrateImages(q[3].rows);
  return {account:a,categories:q[0].rows,groups:q[1].rows,offers,publications,monitors:q[4].rows,queues:q[5].rows,schedules:q[6].rows,leadStats:q[7].rows,activity:q[8].rows,integrations:q[9].rows,automation:q[10].rows[0]||{}};
}

const allowed={offer:['APPROVED','REJECTED','SCHEDULED','PUBLISHED'],group:['ACTIVE','PAUSED'],publication:['READY','SCHEDULED','PUBLISHED','FAILED'],monitor:['ACTIVE','PAUSED'],queue:['ACTIVE','PAUSED'],schedule:['ACTIVE','PAUSED']};

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const correlationId=crypto.randomUUID();
  try{
    const a=await getAccount(req.member);
    if(req.method==='GET')return res.json(await all(a));
    const b=req.body||{},entity=txt(b.entity,30);
    if(req.method==='POST'&&entity==='category'){
      if(!txt(b.name,80)||b.color&&!colorValue(b.color))return res.status(400).json({error:'Informe o nome e uma cor hexadecimal válida.'});
      await db.query('INSERT INTO categories(id,account_id,name,icon,color) VALUES($1,$2,$3,$4,$5)',[uid(),a.id,txt(b.name,80),txt(b.icon,8)||'🏷️',txt(b.color,10)||'#ff6a2a']);
    }else if(req.method==='POST'&&entity==='group'){
      if(!txt(b.name,100))return res.status(400).json({error:'Informe o nome do destino.'});
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      const invite=txt(b.inviteUrl,600);if(invite&&!url(invite))return res.status(400).json({error:'Use um link HTTPS válido.'});
      const platform=txt(b.platform,20)||'WHATSAPP';if(!['WHATSAPP','TELEGRAM'].includes(platform))return res.status(400).json({error:'Plataforma de destino inválida.'});
      const destinationType=platform==='WHATSAPP'?(txt(b.destinationType,20)||'GROUP'):'GROUP';
      if(!['GROUP','CHANNEL','COMMUNITY'].includes(destinationType))return res.status(400).json({error:'Tipo de destino inválido.'});
      const externalId=txt(b.externalId,200)||null;
      await db.query('INSERT INTO promo_groups(id,account_id,name,platform,whatsapp_destination_type,category_id,invite_url,members,capacity,external_id,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[uid(),a.id,txt(b.name,100),platform,destinationType,categoryId,invite,Math.max(0,Number(b.members)||0),Math.max(1,Number(b.capacity)||1024),externalId,'PAUSED']);
    }else if(req.method==='POST'&&entity==='offer'){
      const imageKey=txt(b.imageKey,400)||null;
      if(imageKey&&(!imageKey.startsWith('products/'+String(req.member.id)+'/')||!/^products\/[^/]+\/[a-f\d-]+\.(png|jpg|webp)$/.test(imageKey)))return res.status(400).json({error:'Imagem não pertence à sua conta.'});
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      const title=txt(b.title,220),affiliate=txt(b.affiliateUrl,1200),image=txt(b.imageUrl,1200),product=txt(b.productUrl,1200),coupon=txt(b.couponUrl,1200),couponCode=txt(b.couponCode,100),current=cents(b.currentPrice),original=b.originalPrice?cents(b.originalPrice):null;
      if(!title||!Number.isFinite(current)||current<=0||original!==null&&(!Number.isFinite(original)||original<current)||!url(affiliate)||!mediaUrl(image)||product&&!url(product)||coupon&&!url(coupon))return res.status(400).json({error:'Informe produto, preços válidos, link HTTPS de afiliado e uma imagem válida.'});
      const source=txt(b.source,50)||'Outro',fp=await makeFingerprint({title,source,productUrl:product||affiliate,affiliateUrl:affiliate});
      const categoryName=categoryId?(await db.query('SELECT name FROM categories WHERE id=$1 AND account_id=$2',[categoryId,a.id])).rows[0]?.name:'';
      const automatic=formatPromo({title,source,category:categoryName,currentPrice:current,originalPrice:original,affiliateUrl:affiliate,couponUrl:coupon,couponCode,template:txt(b.messageTemplate,30)}).message;
      const created=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PENDING',$15,$16,'APPROVED','MANUAL') ON CONFLICT DO NOTHING RETURNING id",[uid(),a.id,title,source,original,current,categoryId,affiliate,image,product||null,coupon||null,couponCode||null,percent(current,original),score(title,current,original),txt(b.message,3000)||automatic,fp]);
      if(!created.rows.length)return res.status(409).json({error:'Esta oferta já está cadastrada.'});
      if(imageKey)await db.query('UPDATE offers SET image_storage_key=$1 WHERE id=$2 AND account_id=$3',[imageKey,created.rows[0].id,a.id]);
    }else if(req.method==='POST'&&entity==='publication'){
      const offerId=txt(b.offerId,80),groupId=txt(b.groupId,80),found=(await db.query('SELECT message,image_url,image_storage_key,status FROM offers WHERE id=$1 AND account_id=$2',[offerId,a.id])).rows[0],group=(await db.query('SELECT id,platform,external_id,status FROM promo_groups WHERE id=$1 AND account_id=$2',[groupId,a.id])).rows[0];
      if(!found||!group)return res.status(400).json({error:'Oferta ou grupo não pertence à sua conta.'});
      if(!['APPROVED','PUBLISHED'].includes(found.status))return res.status(412).json({error:'Aprove a oferta antes de preparar o envio.'});
      if(b.scheduledAt&&!Number.isFinite(Date.parse(b.scheduledAt)))return res.status(400).json({error:'Data de agendamento inválida.'});
      if(group.status!=='ACTIVE'||!String(group.external_id||'').trim())return res.status(412).json({error:'Ative um destino com ID oficial antes de preparar o envio.'});
      await db.query('INSERT INTO publications(id,account_id,offer_id,group_id,status,scheduled_at,message,image_url,mode,priority,mention_all,image_storage_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[uid(),a.id,offerId,groupId,b.scheduledAt?'SCHEDULED':'READY',b.scheduledAt||null,txt(b.message,3000)||found.message,found.image_url,txt(b.mode,30)||'ON_DEMAND',b.priority==='FLASH'?100:0,b.mentionAll==='true',found.image_storage_key]);
      if(group.platform==='TELEGRAM'&&!b.scheduledAt)await scheduler.now('/api/jobs/telegram');
    }else if(req.method==='POST'&&entity==='monitor'){
      if(b.affiliateUrl&&!httpsUrl(b.affiliateUrl))return res.status(400).json({error:'Link oficial de afiliado inválido.'});
      if(!txt(b.name,120)||!url(b.sourceUrl)||!['WHATSAPP_GROUP','TELEGRAM_CHANNEL','WEBSITE','MARKETPLACE','FEED'].includes(b.sourceType||'WHATSAPP_GROUP')||!['SMART','ALL','CLONE'].includes(b.mode||'SMART'))return res.status(400).json({error:'Informe nome, origem HTTPS e modo válidos.'});
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      await db.query('INSERT INTO monitors(id,account_id,name,source_type,source_url,category_id,mode,status,source_authorized,affiliate_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[uid(),a.id,txt(b.name,120),txt(b.sourceType,40)||'WHATSAPP_GROUP',txt(b.sourceUrl,1000),categoryId,txt(b.mode,30)||'SMART','PAUSED',booleanValue(b.sourceAuthorized),httpsUrl(b.affiliateUrl)||'']);
    }else if(req.method==='POST'&&entity==='queue'){
      if(!txt(b.name,120)||!timeValue(b.startTime||'08:00')||!timeValue(b.endTime||'22:00')||!['NEWEST_FIRST','BEST_SCORE','BIGGEST_DISCOUNT','FIFO'].includes(b.priorityMode||'NEWEST_FIRST'))return res.status(400).json({error:'Informe nome, horários e prioridade válidos.'});
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      await db.query('INSERT INTO queues(id,account_id,name,category_id,start_time,end_time,interval_minutes,priority_mode,mention_all,link_preview,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[uid(),a.id,txt(b.name,120),categoryId,txt(b.startTime,5)||'08:00',txt(b.endTime,5)||'22:00',Math.max(1,Math.min(30,Number(b.intervalMinutes)||10)),txt(b.priorityMode,30)||'NEWEST_FIRST',b.mentionAll==='true',b.linkPreview!=='false','ACTIVE']);
    }else if(req.method==='POST'&&entity==='schedule'){
      const recurrence=b.recurrence||'DAILY',weekday=Number(b.weekday??1),onceDate=txt(b.onceDate,10)||null;
      if(!txt(b.name,120)||!txt(b.message,2500)||!timeValue(b.sendTime||'09:00')||!['DAILY','WEEKLY','WEEKDAYS','ONCE'].includes(recurrence)||!Number.isInteger(weekday)||weekday<0||weekday>6||recurrence==='ONCE'&&!validDay(onceDate))return res.status(400).json({error:'Informe nome, mensagem, horário, dia e recorrência válidos.'});
      const groupId=txt(b.groupId,80)||null;if(!groupId||!(await belongs('promo_groups',groupId,a.id)))return res.status(400).json({error:'Grupo inválido.'});
      await db.query('INSERT INTO schedules(id,account_id,name,message,group_id,recurrence,send_time,status,weekday,once_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[uid(),a.id,txt(b.name,120),txt(b.message,2500),groupId,recurrence,txt(b.sendTime,5)||'09:00','PAUSED',weekday,onceDate]);
    }else if(req.method==='PUT'&&entity==='groupConfig'){
      const item=txt(b.id,100),categoryId=txt(b.categoryId,80)||null,platform=txt(b.platform,20)||'WHATSAPP',externalId=txt(b.externalId,200)||null,invite=txt(b.inviteUrl,600),destinationType=platform==='WHATSAPP'?(txt(b.destinationType,20)||'GROUP'):'GROUP';
      if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      if(!['WHATSAPP','TELEGRAM'].includes(platform))return res.status(400).json({error:'Plataforma de grupo inválida.'});
      if(!['GROUP','CHANNEL','COMMUNITY'].includes(destinationType))return res.status(400).json({error:'Tipo de destino inválido.'});
      if(invite&&!url(invite))return res.status(400).json({error:'Use um link HTTPS válido.'});
      const changed=await db.query("UPDATE promo_groups SET name=$1,platform=$2,whatsapp_destination_type=$3,category_id=$4,invite_url=$5,members=$6,capacity=$7,external_id=$8,status='PAUSED' WHERE id=$9 AND account_id=$10 RETURNING id",[txt(b.name,100),platform,destinationType,categoryId,invite,Math.max(0,Number(b.members)||0),Math.max(1,Number(b.capacity)||1024),externalId,item,a.id]);
      if(!changed.rows.length)return res.status(404).json({error:'Destino não encontrado.'});
    }else if(req.method==='PUT'){
      const item=txt(b.id,100),status=txt(b.status,20),table={offer:'offers',group:'promo_groups',publication:'publications',monitor:'monitors',queue:'queues',schedule:'schedules'}[entity];
      if(!table||!allowed[entity]?.includes(status))return res.status(400).json({error:'Status ou ação inválida.'});
      if(entity==='schedule'){const changed=await setScheduleStatus(a.id,item,status);return res.json({ok:true,...changed});}
      if(entity==='publication'){
        if(status==='PUBLISHED')return res.status(412).json({error:'A entrega precisa ser confirmada pelo conector oficial.'});
        const current=(await db.query('SELECT status FROM publications WHERE id=$1 AND account_id=$2',[item,a.id])).rows[0];
        if(!current)return res.status(404).json({error:'Registro não encontrado.'});
        if(['PUBLISHED','DISPATCHING'].includes(current.status))return res.status(409).json({error:'Esta publicação já foi enviada ou está em envio.'});
        if(current.status==='WAITING_CONFIRMATION'&&!booleanValue(b.confirmedNotDelivered))return res.status(409).json({error:'Confirme no destino que não houve entrega antes de reenviar.'});
      }
      if(entity==='monitor'&&status==='ACTIVE')await canActivateMonitor(a.id,item);
      if(entity==='group'&&status==='ACTIVE'){
        const destination=(await db.query('SELECT external_id FROM promo_groups WHERE id=$1 AND account_id=$2',[item,a.id])).rows[0];
        if(!destination)return res.status(404).json({error:'Destino não encontrado.'});
        if(!String(destination.external_id||'').trim())return res.status(412).json({error:'Informe o ID oficial antes de ativar este destino.'});
      }
      const changed=await db.query('UPDATE '+table+' SET status=$1 WHERE id=$2 AND account_id=$3 RETURNING id',[status,item,a.id]);
      if(!changed.rows.length)return res.status(404).json({error:'Registro não encontrado.'});
    }else if(req.method==='DELETE'){
      const table={category:'categories',group:'promo_groups',offer:'offers',publication:'publications',monitor:'monitors',queue:'queues',schedule:'schedules'}[txt(req.query.entity,30)];
      if(!table)return res.status(400).json({error:'Ação inválida.'});
      if(table==='schedules'){await setScheduleStatus(a.id,txt(req.query.id,100),'ARCHIVED');return res.json({ok:true});}
      if(table==='monitors'){const r=await db.query("UPDATE monitors SET status='ARCHIVED' WHERE id=$1 AND account_id=$2 RETURNING id",[txt(req.query.id,100),a.id]);return res.status(r.rows.length?200:404).json(r.rows.length?{ok:true}:{error:'Monitor não encontrado.'});}
      const removed=await db.query('DELETE FROM '+table+' WHERE id=$1 AND account_id=$2 RETURNING id',[txt(req.query.id,100),a.id]);
      if(!removed.rows.length)return res.status(404).json({error:'Registro não encontrado.'});
    }else return res.status(400).json({error:'Ação inválida.'});
    return res.json({ok:true});
  }catch(e){if(!e.status)console.error('api/data',correlationId,e);return res.status(e.status||500).json({error:e.status?e.message:'Não foi possível concluir a operação.',correlationId})}
}
