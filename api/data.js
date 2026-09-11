import { db,scheduler } from 'hatchable';
import { fingerprint as makeFingerprint } from 'lib/automation.js';
import { formatPromo } from 'lib/promo-message.js';

export const access='member';
export const methods=['GET','POST','PUT','DELETE'];

const uid=()=>crypto.randomUUID(),txt=(v,n=500)=>String(v??'').trim().slice(0,n),cents=v=>Math.round(Number(v||0)*100);
const STORES=['AMAZON','SHOPEE','MERCADO_LIVRE','SHEIN','ALIEXPRESS','MAGALU','CASAS_BAHIA','HOTMART','KABUM','AMERICANAS','NATURA','AVON'];
const url=v=>{try{return new URL(v).protocol==='https:'}catch{return false}};
const cash=v=>(Number(v||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percent=(c,o)=>o>c?Math.round((o-c)*100/o):0;
const score=(t,c,o)=>Math.max(35,Math.min(98,45+percent(c,o)+(/iphone|samsung|air fryer|fralda|notebook|tv|playstation|perfume/i.test(t)?18:8)));
const slugify=v=>txt(v,80).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'operacao';

async function getAccount(member){
  const memberId=String(member.id);
  let a=(await db.query('SELECT id,name,slug,plan,status FROM accounts WHERE owner_member_id=$1',[memberId])).rows[0];
  if(a)return a;
  const slug=slugify(member.display_name||member.handle||'operacao')+'-'+memberId.slice(-6).toLowerCase();
  a=(await db.query('INSERT INTO accounts(id,owner_member_id,name,slug) VALUES($1,$2,$3,$4) RETURNING id,name,slug,plan,status',[uid(),memberId,txt(member.display_name||'Minha operação',100),slug])).rows[0];
  await db.query('INSERT INTO storefront_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',[a.id]);
  await db.query('INSERT INTO account_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',[a.id]);
  for(const store of STORES)await db.query('INSERT INTO marketplace_rules(id,account_id,marketplace) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[uid(),a.id,store]);
  return a;
}

async function starter(accountId){
  if((await db.query('SELECT id FROM categories WHERE account_id=$1 LIMIT 1',[accountId])).rows.length)return;
  const defs=[['Ofertas gerais','🔥','#ff6a2a'],['Tecnologia','📱','#1967d2'],['Casa e cozinha','🏠','#0a8f66'],['Bebês e crianças','🧸','#d84f88'],['Moda e beleza','✨','#7c3aed'],['Pet','🐾','#c77a00'],['Produtos importados','🌍','#2563eb']],ids={};
  for(const c of defs){const id=uid();ids[c[0]]=id;await db.query('INSERT INTO categories(id,account_id,name,icon,color) VALUES($1,$2,$3,$4,$5)',[id,accountId,...c])}
  for(const g of [['Achadinhos do Dia','Ofertas gerais'],['Tecnologia e Games','Tecnologia'],['Casa e Eletrodomésticos','Casa e cozinha'],['Ofertas para Bebês','Bebês e crianças'],['Produtos Importados','Produtos importados']])await db.query('INSERT INTO promo_groups(id,account_id,name,category_id) VALUES($1,$2,$3,$4)',[uid(),accountId,g[0],ids[g[1]]]);
}

async function belongs(table,id,accountId){return Boolean((await db.query('SELECT id FROM '+table+' WHERE id=$1 AND account_id=$2',[id,accountId])).rows.length)}
async function categoryOk(id,a){return !id||belongs('categories',id,a)}

async function all(a){
  await starter(a.id);
  const q=await Promise.all([
    db.query('SELECT id,name,icon,color,created_at AS "createdAt" FROM categories WHERE account_id=$1 ORDER BY name',[a.id]),
    db.query('SELECT id,name,platform,category_id AS "categoryId",invite_url AS "inviteUrl",members,status,external_id AS "externalId",capacity,joined_24h AS "joined24h",left_24h AS "left24h",marketplace_subids AS "marketplaceSubids",created_at AS "createdAt" FROM promo_groups WHERE account_id=$1 ORDER BY platform,name',[a.id]),
    db.query('SELECT id,title,source,original_price AS "originalPrice",current_price AS "currentPrice",category_id AS "categoryId",affiliate_url AS "affiliateUrl",image_url AS "imageUrl",product_url AS "productUrl",coupon_url AS "couponUrl",coupon_code AS "couponCode",discount_percent AS "discountPercent",score,status,message,fingerprint,validation_status AS "validationStatus",imported_by AS "importedBy",storefront_visible AS "storefrontVisible",detected_at AS "detectedAt",created_at AS "createdAt" FROM offers WHERE account_id=$1 ORDER BY created_at DESC LIMIT 250',[a.id]),
    db.query('SELECT id,offer_id AS "offerId",group_id AS "groupId",status,scheduled_at AS "scheduledAt",published_at AS "publishedAt",clicks,message,image_url AS "imageUrl",mode,attempts,error_message AS "errorMessage",priority,mention_all AS "mentionAll",connection_id AS "connectionId",created_at AS "createdAt" FROM publications WHERE account_id=$1 ORDER BY priority DESC,created_at DESC LIMIT 250',[a.id]),
    db.query('SELECT id,name,source_type AS "sourceType",source_url AS "sourceUrl",category_id AS "categoryId",mode,status,captured_count AS "capturedCount",last_run_at AS "lastRunAt",created_at AS "createdAt" FROM monitors WHERE account_id=$1 ORDER BY created_at DESC',[a.id]),
    db.query('SELECT id,name,category_id AS "categoryId",start_time AS "startTime",end_time AS "endTime",interval_minutes AS "intervalMinutes",priority_mode AS "priorityMode",mention_all AS "mentionAll",link_preview AS "linkPreview",status,created_at AS "createdAt" FROM queues WHERE account_id=$1 ORDER BY created_at DESC',[a.id]),
    db.query('SELECT id,name,message,group_id AS "groupId",recurrence,send_time AS "sendTime",status,last_run_at AS "lastRunAt",created_at AS "createdAt" FROM schedules WHERE account_id=$1 ORDER BY created_at DESC',[a.id]),
    db.query("SELECT group_id AS \"groupId\",count(*) FILTER(WHERE event_type='JOIN')::int AS joined,count(*) FILTER(WHERE event_type='LEAVE')::int AS left,count(DISTINCT phone_hash)::int AS unique_leads FROM lead_events WHERE account_id=$1 AND occurred_at>now()-interval '30 days' GROUP BY group_id",[a.id]),
    db.query('SELECT id,event_type AS "eventType",title,details,status,created_at AS "createdAt" FROM activity_log WHERE account_id=$1 ORDER BY created_at DESC LIMIT 20',[a.id]),
    db.query('SELECT name,status,details,last_checked_at AS "lastCheckedAt" FROM integration_health ORDER BY name'),
    db.query('SELECT auto_approve AS "autoApprove",minimum_score AS "minimumScore",maximum_batch AS "maximumBatch",require_image AS "requireImage",require_affiliate_link AS "requireAffiliateLink",timezone FROM account_settings WHERE account_id=$1',[a.id])
  ]);
  return {account:a,categories:q[0].rows,groups:q[1].rows,offers:q[2].rows,publications:q[3].rows,monitors:q[4].rows,queues:q[5].rows,schedules:q[6].rows,leadStats:q[7].rows,activity:q[8].rows,integrations:q[9].rows,automation:q[10].rows[0]||{}};
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
      if(!txt(b.name,80))return res.status(400).json({error:'Informe o nome.'});
      await db.query('INSERT INTO categories(id,account_id,name,icon,color) VALUES($1,$2,$3,$4,$5)',[uid(),a.id,txt(b.name,80),txt(b.icon,8)||'🏷️',txt(b.color,10)||'#ff6a2a']);
    }else if(req.method==='POST'&&entity==='group'){
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      const invite=txt(b.inviteUrl,600);if(invite&&!url(invite))return res.status(400).json({error:'Use um link HTTPS válido.'});
      const platform=txt(b.platform,20)||'WHATSAPP';if(!['WHATSAPP','TELEGRAM'].includes(platform))return res.status(400).json({error:'Plataforma de grupo inválida.'});
      await db.query('INSERT INTO promo_groups(id,account_id,name,platform,category_id,invite_url,members,capacity,external_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[uid(),a.id,txt(b.name,100),platform,categoryId,invite,Math.max(0,Number(b.members)||0),Math.max(1,Number(b.capacity)||1024),txt(b.externalId,200)||null]);
    }else if(req.method==='POST'&&entity==='offer'){
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      const title=txt(b.title,220),affiliate=txt(b.affiliateUrl,1200),image=txt(b.imageUrl,1200),product=txt(b.productUrl,1200),coupon=txt(b.couponUrl,1200),couponCode=txt(b.couponCode,100),current=cents(b.currentPrice),original=b.originalPrice?cents(b.originalPrice):null;
      if(!title||current<=0||!url(affiliate)||!url(image))return res.status(400).json({error:'Preencha produto, preço, link de afiliado e imagem.'});
      const source=txt(b.source,50)||'Outro',fp=await makeFingerprint({title,source,productUrl:product||affiliate,affiliateUrl:affiliate});
      const categoryName=categoryId?(await db.query('SELECT name FROM categories WHERE id=$1 AND account_id=$2',[categoryId,a.id])).rows[0]?.name:'';
      const automatic=formatPromo({title,source,category:categoryName,currentPrice:current,originalPrice:original,affiliateUrl:affiliate,couponUrl:coupon,couponCode,template:txt(b.messageTemplate,30)}).message;
      const created=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PENDING',$15,$16,'APPROVED','MANUAL') ON CONFLICT DO NOTHING RETURNING id",[uid(),a.id,title,source,original,current,categoryId,affiliate,image,product||null,coupon||null,couponCode||null,percent(current,original),score(title,current,original),txt(b.message,3000)||automatic,fp]);
      if(!created.rows.length)return res.status(409).json({error:'Esta oferta já está cadastrada.'});
    }else if(req.method==='POST'&&entity==='publication'){
      const offerId=txt(b.offerId,80),groupId=txt(b.groupId,80),found=(await db.query('SELECT message,image_url FROM offers WHERE id=$1 AND account_id=$2',[offerId,a.id])).rows[0],group=(await db.query('SELECT id,platform FROM promo_groups WHERE id=$1 AND account_id=$2',[groupId,a.id])).rows[0];
      if(!found||!group)return res.status(400).json({error:'Oferta ou grupo não pertence à sua conta.'});
      await db.query('INSERT INTO publications(id,account_id,offer_id,group_id,status,scheduled_at,message,image_url,mode,priority,mention_all) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[uid(),a.id,offerId,groupId,b.scheduledAt?'SCHEDULED':'READY',b.scheduledAt||null,txt(b.message,3000)||found.message,found.image_url,txt(b.mode,30)||'ON_DEMAND',b.priority==='FLASH'?100:0,b.mentionAll==='true']);
      if(group.platform==='TELEGRAM'&&!b.scheduledAt)await scheduler.now('/api/jobs/telegram');
    }else if(req.method==='POST'&&entity==='monitor'){
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      await db.query('INSERT INTO monitors(id,account_id,name,source_type,source_url,category_id,mode,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[uid(),a.id,txt(b.name,120),txt(b.sourceType,40)||'WHATSAPP_GROUP',txt(b.sourceUrl,1000),categoryId,txt(b.mode,30)||'SMART','PAUSED']);
    }else if(req.method==='POST'&&entity==='queue'){
      const categoryId=txt(b.categoryId,80)||null;if(!(await categoryOk(categoryId,a.id)))return res.status(400).json({error:'Categoria inválida.'});
      await db.query('INSERT INTO queues(id,account_id,name,category_id,start_time,end_time,interval_minutes,priority_mode,mention_all,link_preview,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[uid(),a.id,txt(b.name,120),categoryId,txt(b.startTime,5)||'08:00',txt(b.endTime,5)||'22:00',Math.max(1,Math.min(30,Number(b.intervalMinutes)||10)),txt(b.priorityMode,30)||'NEWEST_FIRST',b.mentionAll==='true',b.linkPreview!=='false','ACTIVE']);
    }else if(req.method==='POST'&&entity==='schedule'){
      const groupId=txt(b.groupId,80)||null;if(groupId&&!(await belongs('promo_groups',groupId,a.id)))return res.status(400).json({error:'Grupo inválido.'});
      await db.query('INSERT INTO schedules(id,account_id,name,message,group_id,recurrence,send_time,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[uid(),a.id,txt(b.name,120),txt(b.message,2500),groupId,txt(b.recurrence,30)||'DAILY',txt(b.sendTime,5)||'09:00','ACTIVE']);
    }else if(req.method==='PUT'){
      const item=txt(b.id,100),status=txt(b.status,20),table={offer:'offers',group:'promo_groups',publication:'publications',monitor:'monitors',queue:'queues',schedule:'schedules'}[entity];
      if(!table||!allowed[entity]?.includes(status))return res.status(400).json({error:'Status ou ação inválida.'});
      const changed=await db.query('UPDATE '+table+' SET status=$1 WHERE id=$2 AND account_id=$3 RETURNING id',[status,item,a.id]);
      if(!changed.rows.length)return res.status(404).json({error:'Registro não encontrado.'});
      if(entity==='publication'&&status==='PUBLISHED')await db.query('UPDATE publications SET published_at=now() WHERE id=$1 AND account_id=$2',[item,a.id]);
    }else if(req.method==='DELETE'){
      const table={category:'categories',group:'promo_groups',offer:'offers',publication:'publications',monitor:'monitors',queue:'queues',schedule:'schedules'}[txt(req.query.entity,30)];
      if(!table)return res.status(400).json({error:'Ação inválida.'});
      const removed=await db.query('DELETE FROM '+table+' WHERE id=$1 AND account_id=$2 RETURNING id',[txt(req.query.id,100),a.id]);
      if(!removed.rows.length)return res.status(404).json({error:'Registro não encontrado.'});
    }else return res.status(400).json({error:'Ação inválida.'});
    return res.json({ok:true});
  }catch(e){console.error('api/data',correlationId,e);return res.status(500).json({error:'Não foi possível concluir a operação.',correlationId})}
}
