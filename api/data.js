import { db } from 'hatchable';
import { fingerprint as makeFingerprint } from 'lib/automation.js';

export const access = 'admin';
export const methods = ['GET','POST','PUT','DELETE'];

const uid = () => crypto.randomUUID();
const txt = (v, max=500) => String(v ?? '').trim().slice(0,max);
const cents = v => Math.round(Number(v || 0) * 100);
const url = v => { try { const u = new URL(v); return u.protocol === 'https:'; } catch { return false; } };
const cash = v => (Number(v || 0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percent = (current, original) => original > current ? Math.round((original-current)*100/original) : 0;
const score = (title,current,original) => Math.max(35,Math.min(98,45+percent(current,original)+(/iphone|samsung|air fryer|fralda|notebook|tv|playstation|perfume/i.test(title)?18:8)));
const promo = (title,current,original,link,coupon='') => ['🔥 OFERTA ENCONTRADA!','', '🛍️ '+title, original>current?'💰 De '+cash(original)+' por '+cash(current):'💰 Por '+cash(current), coupon?'🎟️ Cupom disponível: '+coupon:'', '', '🛒 Confira: '+link, '⚠️ Preço e estoque podem mudar.'].filter(Boolean).join('\n');

async function starter(){
  const check=await db.query('SELECT id FROM categories LIMIT 1');
  if(check.rows.length)return;
  const cats=[['cat-gerais','Ofertas gerais','🔥','#ff6a2a'],['cat-tecnologia','Tecnologia','📱','#1967d2'],['cat-casa','Casa e cozinha','🏠','#0a8f66'],['cat-bebes','Bebês e crianças','🧸','#d84f88'],['cat-beleza','Moda e beleza','✨','#7c3aed'],['cat-pet','Pet','🐾','#c77a00']];
  for(const c of cats)await db.query('INSERT INTO categories(id,name,icon,color) VALUES($1,$2,$3,$4)',c);
  const groups=[['grp-gerais','Achadinhos do Dia','cat-gerais'],['grp-tech','Tecnologia e Games','cat-tecnologia'],['grp-casa','Casa e Eletrodomésticos','cat-casa'],['grp-bebes','Ofertas para Bebês','cat-bebes']];
  for(const g of groups)await db.query('INSERT INTO promo_groups(id,name,category_id) VALUES($1,$2,$3)',g);
}

async function all(){
  await starter();
  const q=await Promise.all([
    db.query('SELECT id,name,icon,color,created_at AS "createdAt" FROM categories ORDER BY name'),
    db.query('SELECT id,name,category_id AS "categoryId",invite_url AS "inviteUrl",members,status,external_id AS "externalId",capacity,joined_24h AS "joined24h",left_24h AS "left24h",created_at AS "createdAt" FROM promo_groups ORDER BY name'),
    db.query('SELECT id,title,source,original_price AS "originalPrice",current_price AS "currentPrice",category_id AS "categoryId",affiliate_url AS "affiliateUrl",image_url AS "imageUrl",product_url AS "productUrl",coupon_url AS "couponUrl",discount_percent AS "discountPercent",score,status,message,fingerprint,validation_status AS "validationStatus",imported_by AS "importedBy",detected_at AS "detectedAt",created_at AS "createdAt" FROM offers ORDER BY created_at DESC LIMIT 250'),
    db.query('SELECT id,offer_id AS "offerId",group_id AS "groupId",status,scheduled_at AS "scheduledAt",published_at AS "publishedAt",clicks,message,image_url AS "imageUrl",mode,attempts,error_message AS "errorMessage",priority,mention_all AS "mentionAll",connection_id AS "connectionId",created_at AS "createdAt" FROM publications ORDER BY priority DESC,created_at DESC LIMIT 250'),
    db.query('SELECT id,name,source_type AS "sourceType",source_url AS "sourceUrl",category_id AS "categoryId",mode,status,captured_count AS "capturedCount",last_run_at AS "lastRunAt",created_at AS "createdAt" FROM monitors ORDER BY created_at DESC'),
    db.query('SELECT id,name,category_id AS "categoryId",start_time AS "startTime",end_time AS "endTime",interval_minutes AS "intervalMinutes",priority_mode AS "priorityMode",mention_all AS "mentionAll",link_preview AS "linkPreview",status,created_at AS "createdAt" FROM queues ORDER BY created_at DESC'),
    db.query('SELECT id,name,message,group_id AS "groupId",recurrence,send_time AS "sendTime",status,last_run_at AS "lastRunAt",created_at AS "createdAt" FROM schedules ORDER BY created_at DESC'),
    db.query("SELECT group_id AS \"groupId\",count(*) FILTER(WHERE event_type='JOIN')::int AS joined,count(*) FILTER(WHERE event_type='LEAVE')::int AS left,count(DISTINCT phone_hash)::int AS unique_leads FROM lead_events WHERE occurred_at>now()-interval '30 days' GROUP BY group_id"),
    db.query('SELECT id,event_type AS "eventType",title,details,status,created_at AS "createdAt" FROM activity_log ORDER BY created_at DESC LIMIT 20'),
    db.query('SELECT name,status,details,last_checked_at AS "lastCheckedAt" FROM integration_health ORDER BY name'),
    db.query("SELECT auto_approve AS \"autoApprove\",minimum_score AS \"minimumScore\",maximum_batch AS \"maximumBatch\",require_image AS \"requireImage\",require_affiliate_link AS \"requireAffiliateLink\" FROM automation_settings WHERE id='default'")
  ]);
  return {categories:q[0].rows,groups:q[1].rows,offers:q[2].rows,publications:q[3].rows,monitors:q[4].rows,queues:q[5].rows,schedules:q[6].rows,leadStats:q[7].rows,activity:q[8].rows,integrations:q[9].rows,automation:q[10].rows[0]||{}};
}

export default async function(req,res){
  // Defesa adicional: o Hatchable já exige `access = 'admin'` na borda.
  // Esta verificação também bloqueia o endpoint caso o arquivo seja executado fora da plataforma.
  if (!req.member) return res.status(401).json({error:'Não autorizado.'});
  try{
    if(req.method==='GET')return res.json(await all());
    const b=req.body||{}, entity=txt(b.entity,30);
    if(req.method==='POST'&&entity==='category'){
      if(!txt(b.name,80))return res.status(400).json({error:'Informe o nome.'});
      await db.query('INSERT INTO categories(id,name,icon,color) VALUES($1,$2,$3,$4)',[uid(),txt(b.name,80),txt(b.icon,8)||'🏷️',txt(b.color,10)||'#ff6a2a']);
    }else if(req.method==='POST'&&entity==='group'){
      const invite=txt(b.inviteUrl,600);if(invite&&!url(invite))return res.status(400).json({error:'Use um link https válido.'});
      await db.query('INSERT INTO promo_groups(id,name,category_id,invite_url,members,capacity,external_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[uid(),txt(b.name,100),txt(b.categoryId,80)||null,invite,Math.max(0,Number(b.members)||0),Math.max(1,Number(b.capacity)||1024),txt(b.externalId,200)||null]);
    }else if(req.method==='POST'&&entity==='offer'){
      const title=txt(b.title,220),affiliate=txt(b.affiliateUrl,1200),image=txt(b.imageUrl,1200),product=txt(b.productUrl,1200),coupon=txt(b.couponUrl,1200);const current=cents(b.currentPrice),original=b.originalPrice?cents(b.originalPrice):null;
      if(!title||!current||!url(affiliate)||!url(image))return res.status(400).json({error:'Preencha produto, preço, link de afiliado e imagem.'});
      const source=txt(b.source,50)||'Outro',fp=await makeFingerprint({title,source,productUrl:product||affiliate,affiliateUrl:affiliate});
      const created=await db.query("INSERT INTO offers(id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,discount_percent,score,status,message,fingerprint,validation_status,imported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PENDING',$13,$14,'APPROVED','MANUAL') ON CONFLICT(fingerprint) DO NOTHING RETURNING id",[uid(),title,source,original,current,txt(b.categoryId,80)||null,affiliate,image,product||null,coupon||null,percent(current,original),score(title,current,original),txt(b.message,3000)||promo(title,current,original,affiliate,coupon),fp]);
      if(!created.rows.length)return res.status(409).json({error:'Esta oferta já está cadastrada.'});
    }else if(req.method==='POST'&&entity==='publication'){
      const offerId=txt(b.offerId,80), groupId=txt(b.groupId,80);if(!offerId||!groupId)return res.status(400).json({error:'Selecione oferta e grupo.'});
      const found=await db.query('SELECT message,image_url FROM offers WHERE id=$1',[offerId]);if(!found.rows.length)return res.status(404).json({error:'Oferta não encontrada.'});
      await db.query('INSERT INTO publications(id,offer_id,group_id,status,scheduled_at,message,image_url,mode,priority,mention_all) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[uid(),offerId,groupId,b.scheduledAt?'SCHEDULED':'READY',b.scheduledAt||null,txt(b.message,3000)||found.rows[0].message,found.rows[0].image_url,txt(b.mode,30)||'ON_DEMAND',b.priority==='FLASH'?100:0,b.mentionAll==='true']);
    }else if(req.method==='POST'&&entity==='monitor'){
      await db.query('INSERT INTO monitors(id,name,source_type,source_url,category_id,mode,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[uid(),txt(b.name,120),txt(b.sourceType,40)||'WHATSAPP_GROUP',txt(b.sourceUrl,1000),txt(b.categoryId,80)||null,txt(b.mode,30)||'SMART',txt(b.status,20)||'PAUSED']);
    }else if(req.method==='POST'&&entity==='queue'){
      await db.query('INSERT INTO queues(id,name,category_id,start_time,end_time,interval_minutes,priority_mode,mention_all,link_preview,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[uid(),txt(b.name,120),txt(b.categoryId,80)||null,txt(b.startTime,5)||'08:00',txt(b.endTime,5)||'22:00',Math.max(1,Math.min(30,Number(b.intervalMinutes)||10)),txt(b.priorityMode,30)||'NEWEST_FIRST',b.mentionAll==='true',b.linkPreview!=='false','ACTIVE']);
    }else if(req.method==='POST'&&entity==='schedule'){
      await db.query('INSERT INTO schedules(id,name,message,group_id,recurrence,send_time,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[uid(),txt(b.name,120),txt(b.message,2500),txt(b.groupId,80)||null,txt(b.recurrence,30)||'DAILY',txt(b.sendTime,5)||'09:00','ACTIVE']);
    }else if(req.method==='PUT'){
      const item=txt(b.id,100),status=txt(b.status,20);
      const table={offer:'offers',group:'promo_groups',publication:'publications',monitor:'monitors',queue:'queues',schedule:'schedules'}[entity];if(!table)return res.status(400).json({error:'Ação inválida.'});
      await db.query('UPDATE '+table+' SET status=$1 WHERE id=$2',[status,item]);
      if(entity==='publication'&&status==='PUBLISHED')await db.query('UPDATE publications SET published_at=now() WHERE id=$1',[item]);
    }else if(req.method==='DELETE'){
      const table={category:'categories',group:'promo_groups',offer:'offers',publication:'publications',monitor:'monitors',queue:'queues',schedule:'schedules'}[txt(req.query.entity,30)];if(!table)return res.status(400).json({error:'Ação inválida.'});
      await db.query('DELETE FROM '+table+' WHERE id=$1',[txt(req.query.id,100)]);
    }else return res.status(400).json({error:'Ação inválida.'});
    return res.json({ok:true});
  }catch(e){return res.status(500).json({error:e?.message||'Erro inesperado.'});}
}
