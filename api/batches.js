import { db,scheduler } from 'hatchable';
import { getOrCreateAccount } from 'lib/accounts.js';
import { httpsUrl } from 'lib/validation.js';
// Offer eligibility is checked from account-scoped rows below.

export const access='member';
export const methods=['GET','POST'];
const clean=(v,n=120)=>String(v??'').trim().slice(0,n);
const id=()=>crypto.randomUUID();

async function owner(req){return getOrCreateAccount(req.member)}
async function loadPreview(accountId,categoryId,groupId){
  const groups=(await db.query("SELECT id,name,platform,category_id AS \"categoryId\",external_id AS \"externalId\",status FROM promo_groups WHERE account_id=$1 AND platform='TELEGRAM' ORDER BY name",[accountId])).rows;
  const botConnected=Boolean((await db.query("SELECT id FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' LIMIT 1",[accountId])).rows[0]);
  const chosen=groupId?groups.filter(g=>g.id===groupId):groups.filter(g=>g.status==='ACTIVE'&&String(g.externalId||'').trim());
  if(groupId&&!chosen.length)throw Object.assign(new Error('Destino Telegram não encontrado nesta conta.'),{status:400});
  const offers=(await db.query("SELECT id,title,source,category_id AS \"categoryId\",current_price AS \"currentPrice\",original_price AS \"originalPrice\",affiliate_url AS \"affiliateUrl\",image_url AS \"imageUrl\",image_storage_key AS \"imageStorageKey\",message,status,storefront_visible AS \"storefrontVisible\" FROM offers WHERE account_id=$1 AND status IN ('APPROVED','PUBLISHED') AND image_url IS NOT NULL AND affiliate_url LIKE 'https://%' AND ($2::text IS NULL OR category_id=$2) ORDER BY created_at DESC LIMIT 100",[accountId,categoryId||null])).rows;
  const validOffers=offers.filter(o=>httpsUrl(o.affiliateUrl)&&Boolean(o.imageUrl));
  const eligible=validOffers;
  const routes=chosen.map(g=>{
    const matching=eligible.filter(o=>!g.categoryId||g.categoryId===o.categoryId);
    return {groupId:g.id,groupName:g.name,platform:g.platform,categoryId:g.categoryId,externalId:g.externalId,status:g.status,botConnected,ready:Boolean(botConnected&&g.status==='ACTIVE'&&String(g.externalId||'').trim()),offers:matching.map(o=>({id:o.id,title:o.title,source:o.source,categoryId:o.categoryId,currentPrice:o.currentPrice,storefrontVisible:o.storefrontVisible})),count:matching.length};
  });
  return {routes,eligibleCount:eligible.length,offerCount:offers.length,botConnected,groupsConfigured:chosen.filter(g=>g.status==='ACTIVE'&&String(g.externalId||'').trim()).length};
}

export default async function(req,res){
 try{
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const account=await owner(req);
  if(req.method==='GET'){
    const rows=(await db.query("SELECT batch_id AS \"batchId\",batch_category_id AS \"categoryId\",group_id AS \"groupId\",status,count(*)::int AS count,min(created_at) AS \"createdAt\",max(published_at) AS \"publishedAt\" FROM publications WHERE account_id=$1 AND batch_id IS NOT NULL GROUP BY batch_id,batch_category_id,group_id,status ORDER BY min(created_at) DESC LIMIT 100",[account.id])).rows;
    return res.json({batches:rows});
  }
  const body=req.body||{},action=clean(body.action,20).toUpperCase(),categoryId=clean(body.categoryId,100)||null,groupId=clean(body.groupId,100)||null;
  if(!['PREVIEW','SEND'].includes(action))return res.status(400).json({error:'Ação inválida.'});
  const preview=await loadPreview(account.id,categoryId,groupId);
  if(action==='PREVIEW')return res.json({ok:true,...preview,note:'Prévia somente leitura; nenhum envio foi feito.'});
  const group=preview.routes.find(g=>g.groupId===groupId);
  if(!group||!group.ready)return res.status(412).json({error:'Ative um destino Telegram e informe o ID oficial antes de enviar.'});
  if(!group.count)return res.status(412).json({error:'Não há ofertas aprovadas, com imagem e link individual HTTPS válido para este lote.'});
  if(body.confirmSend!==true)return res.status(400).json({error:'Confirmação explícita necessária para publicar ofertas reais.'});
  const batchId=id();
  const candidates=preview.routes[0].offers;
  const existing=(await db.query("SELECT offer_id AS \"offerId\" FROM publications WHERE account_id=$1 AND group_id=$2 AND status IN ('READY','RETRY','SCHEDULED','DISPATCHING','PUBLISHED') AND offer_id IS NOT NULL",[account.id,groupId])).rows;
  const already=new Set(existing.map(x=>x.offerId));
  const offers=candidates.filter(o=>!already.has(o.id));
  if(!offers.length)return res.status(409).json({error:'Todas as ofertas deste lote já têm publicação existente neste destino.'});
  await db.transaction(offers.map(o=>({sql:"INSERT INTO publications(id,account_id,offer_id,group_id,status,scheduled_at,message,image_url,image_storage_key,mode,priority,batch_id,batch_category_id) SELECT $1,$2,o.id,$4,'READY',NULL,o.message,o.image_url,o.image_storage_key,'BATCH',0,$5,$6 FROM offers o WHERE o.id=$3 AND o.account_id=$2 AND o.status IN ('APPROVED','PUBLISHED') AND o.affiliate_url LIKE 'https://%' AND o.image_url IS NOT NULL",params:[id(),account.id,o.id,groupId,batchId,categoryId||o.categoryId||null]})));
  await scheduler.now('/api/jobs/telegram');
  const result=(await db.query("SELECT status,count(*)::int AS count FROM publications WHERE account_id=$1 AND batch_id=$2 GROUP BY status",[account.id,batchId])).rows;
  return res.json({ok:true,batchId,prepared:offers.length,results:result,message:'Lote enviado ao agendador. Confira o status por publicação antes de reenviar.'});
 }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'Falha ao processar lote.'})}
}