import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET','POST','PUT','DELETE'];

const clean = (v,n=2000) => String(v ?? '').trim().slice(0,n);
const uid = () => crypto.randomUUID();
const shape = row => ({
  id:row.id, offerId:row.offer_id, productTitle:row.product_title,
  productSource:row.product_source, productUrl:row.product_url, imageUrl:row.image_url,
  priceCents:row.price_cents==null?null:Number(row.price_cents),
  originalPriceCents:row.original_price_cents==null?null:Number(row.original_price_cents),
  template:row.template, durationSeconds:row.duration_seconds, script:row.script,
  caption:row.caption, status:row.status, contentType:row.content_type,
  sizeBytes:Number(row.size_bytes||0), videoUrl:row.storage_key?'/api/video-studio/file/'+row.id:'',
  lastError:row.last_error, createdAt:row.created_at, updatedAt:row.updated_at
});
async function account(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];
}
const selectProject = `SELECT id,offer_id,product_title,product_source,product_url,image_url,
 price_cents,original_price_cents,template,duration_seconds,script,caption,status,
 content_type,size_bytes,storage_key,last_error,created_at,updated_at
 FROM video_studio_projects`;

export default async function(req,res) {
  if(!req.member)return res.status(401).json({error:'Entre para acessar o Estúdio de Vídeos.'});
  const owner=await account(req.member);
  if(!owner)return res.status(412).json({error:'Abra o painel do Radar uma vez para inicializar sua conta.'});
  const a=owner.id;
  if(req.method==='GET') {
    const [offers,projects]=await Promise.all([
      db.query(`SELECT o.id,o.title,o.source,o.current_price AS "currentPrice",o.original_price AS "originalPrice",
       o.affiliate_url AS "affiliateUrl",o.image_url AS "imageUrl",
       EXISTS(SELECT 1 FROM offer_price_history ph WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
         AND ph.source_type='OFFICIAL_API' AND ph.verified_at IS NOT NULL
         AND ph.verified_at>now()-interval '24 hours' AND ph.price=o.current_price
         AND ph.original_price=o.original_price
         AND ph.verified_at=(SELECT MAX(ph2.verified_at) FROM offer_price_history ph2
           WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id AND ph2.source_type='OFFICIAL_API')) AS "priceVerified"
       FROM offers o WHERE o.account_id=$1 AND o.status IN ('APPROVED','PUBLISHED')
       ORDER BY o.created_at DESC LIMIT 100`,[a]),
      db.query(selectProject+` WHERE account_id=$1 ORDER BY created_at DESC LIMIT 50`,[a])
    ]);
    return res.json({offers:offers.rows.map(x=>({...x,currentPrice:Number(x.currentPrice),originalPrice:x.originalPrice==null?null:Number(x.originalPrice)})),projects:projects.rows.map(shape)});
  }
  if(req.method==='POST') {
    const b=req.body||{},offerId=clean(b.offerId,100);
    let p;
    if(offerId) {
      p=(await db.query(`SELECT id,title,source,affiliate_url,image_url,current_price,original_price
       FROM offers WHERE id=$1 AND account_id=$2 AND status IN ('APPROVED','PUBLISHED')`,[offerId,a])).rows[0];
      if(!p)return res.status(404).json({error:'Oferta aprovada não encontrada nesta conta.'});
    } else {
      p={title:clean(b.productTitle,220),source:clean(b.productSource,50),affiliate_url:clean(b.productUrl,1200),image_url:clean(b.imageUrl,1200),current_price:null,original_price:null};
      if(!p.title||!p.affiliate_url||!/^https:\/\//i.test(p.affiliate_url))return res.status(400).json({error:'Informe título e link HTTPS do produto, ou selecione uma oferta aprovada.'});
      if(p.image_url&&!/^https:\/\//i.test(p.image_url))return res.status(400).json({error:'A imagem precisa usar HTTPS.'});
    }
    const duration=[15,30,45,60].includes(Number(b.durationSeconds))?Number(b.durationSeconds):15;
    const template=['OFERTA','UGC','VITRINE','IMPORTADO'].includes(clean(b.template,20))?clean(b.template,20):'OFERTA';
    const id=uid(),script=clean(b.script,12000),caption=clean(b.caption,3000);
    const row=(await db.query(`INSERT INTO video_studio_projects
      (id,account_id,offer_id,product_title,product_source,product_url,image_url,price_cents,original_price_cents,template,duration_seconds,script,caption,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'DRAFT')
      RETURNING id,offer_id,product_title,product_source,product_url,image_url,price_cents,original_price_cents,template,duration_seconds,script,caption,status,content_type,size_bytes,storage_key,last_error,created_at,updated_at`,
      [id,a,offerId||null,p.title,p.source||'',p.affiliate_url,p.image_url||'',p.current_price??null,p.original_price??null,template,duration,script,caption])).rows[0];
    return res.status(201).json({ok:true,project:shape(row)});
  }
  if(req.method==='PUT') {
    const b=req.body||{},id=clean(b.id,80);
    const updated=await db.query(`UPDATE video_studio_projects SET
      script=CASE WHEN $3::boolean THEN $4 ELSE script END,
      caption=CASE WHEN $5::boolean THEN $6 ELSE caption END,
      template=CASE WHEN $7::boolean THEN $8 ELSE template END,
      duration_seconds=CASE WHEN $9::boolean THEN $10 ELSE duration_seconds END,
      status=CASE WHEN $11::boolean THEN $12 ELSE status END,
      last_error=CASE WHEN $13::boolean THEN $14 ELSE last_error END,
      updated_at=now()
      WHERE id=$1 AND account_id=$2
      RETURNING id,offer_id,product_title,product_source,product_url,image_url,price_cents,original_price_cents,template,duration_seconds,script,caption,status,content_type,size_bytes,storage_key,last_error,created_at,updated_at`,
      [id,a,b.script!==undefined,clean(b.script,12000),b.caption!==undefined,clean(b.caption,3000),b.template!==undefined,['OFERTA','UGC','VITRINE','IMPORTADO'].includes(clean(b.template,20))?clean(b.template,20):'OFERTA',b.durationSeconds!==undefined,[15,30,45,60].includes(Number(b.durationSeconds))?Number(b.durationSeconds):15,b.status!==undefined,['DRAFT','RENDERING','READY','FAILED'].includes(clean(b.status,20))?clean(b.status,20):'DRAFT',b.lastError!==undefined,clean(b.lastError,500)]);
    if(!updated.rows.length)return res.status(404).json({error:'Projeto não encontrado.'});
    return res.json({ok:true,project:shape(updated.rows[0])});
  }
  if(req.method==='DELETE') {
    const id=clean(req.query?.id,80);
    const removed=await db.query("DELETE FROM video_studio_projects WHERE id=$1 AND account_id=$2 AND status<>'READY' RETURNING id",[id,a]);
    if(!removed.rows.length)return res.status(404).json({error:'Projeto não encontrado ou já possui vídeo finalizado.'});
    return res.json({ok:true,id});
  }
  return res.status(405).json({error:'Método não permitido.'});
}