import { db } from 'hatchable';

export const access='member';
export const methods=['GET','POST','PUT','DELETE'];
const uid=()=>crypto.randomUUID(),clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const STORES=['AMAZON','SHOPEE','MERCADO_LIVRE','SHEIN','ALIEXPRESS','MAGALU','CASAS_BAHIA','HOTMART','KABUM','AMERICANAS','NATURA','AVON'];
const NETWORKS=['INSTAGRAM','FACEBOOK','GMAIL','OUTLOOK'];
const PLATFORMS=['META_ADS','GOOGLE_ADS','TIKTOK_ADS','INSTAGRAM','FACEBOOK','EMAIL','ORGANIC'];
const TYPES=['ACCESS','CORRECTION','DELETION','PORTABILITY','REVOCATION'];
async function account(m){return (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(m.id)])).rows[0]}
function https(v){try{return new URL(v).protocol==='https:'}catch{return false}}
async function audit(a,type,severity,details){await db.query('INSERT INTO security_events(account_id,event_type,severity,details) VALUES($1,$2,$3,$4)',[a,type,severity,JSON.stringify(details||{})])}

async function snapshot(a){
  const q=await Promise.all([
    db.query('SELECT id,marketplace,code,title,url,discount_text AS "discountText",starts_at AS "startsAt",ends_at AS "endsAt",status,created_at AS "createdAt" FROM coupons WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100',[a]),
    db.query('SELECT id,name,platform,objective,daily_budget_cents AS "dailyBudget",utm_source AS "utmSource",utm_medium AS "utmMedium",utm_campaign AS "utmCampaign",status,created_at AS "createdAt" FROM growth_campaigns WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100',[a]),
    db.query('SELECT id,network,display_name AS "displayName",status,external_id AS "externalId",capabilities,last_error AS "lastError",updated_at AS "updatedAt" FROM social_connections WHERE account_id=$1 ORDER BY network',[a]),
    db.query('SELECT id,kind,channel,provider_model AS "model",content,asset_url AS "assetUrl",status,created_at AS "createdAt" FROM content_assets WHERE account_id=$1 ORDER BY created_at DESC LIMIT 40',[a]),
    db.query('SELECT retention_days AS "retentionDays",marketing_consent_required AS "marketingConsentRequired",data_export_enabled AS "dataExportEnabled",incident_email AS "incidentEmail",updated_at AS "updatedAt" FROM account_security_settings WHERE account_id=$1',[a]),
    db.query('SELECT id,request_type AS "requestType",requester_email AS "requesterEmail",notes,status,created_at AS "createdAt",resolved_at AS "resolvedAt" FROM privacy_requests WHERE account_id=$1 ORDER BY created_at DESC LIMIT 50',[a]),
    db.query('SELECT id,event_type AS "eventType",severity,details,created_at AS "createdAt" FROM security_events WHERE account_id=$1 ORDER BY created_at DESC LIMIT 30',[a])
  ]);
  return {coupons:q[0].rows,campaigns:q[1].rows,connections:q[2].rows,assets:q[3].rows,security:q[4].rows[0]||{},privacyRequests:q[5].rows,securityEvents:q[6].rows,checks:[
    {name:'Isolamento por conta',status:'ACTIVE',detail:'Consultas e gravações usam account_id.'},
    {name:'Segredos e tokens',status:'ACTIVE',detail:'Credenciais ficam fora do navegador e do banco de conteúdo.'},
    {name:'Webhooks n8n',status:'ACTIVE',detail:'HMAC, janela temporal e idempotência.'},
    {name:'Validação de conteúdo IA',status:'ACTIVE',detail:'Preço, cupom e link são inseridos pelo sistema, não inventados pelo modelo.'},
    {name:'OAuth Meta e e-mail',status:q[2].rows.some(x=>x.status==='ACTIVE')?'PARTIAL':'PENDING',detail:'Exige credenciais, consentimento e revisão do provedor.'},
    {name:'Teste de invasão externo',status:'PENDING',detail:'Recomendado antes de tráfego real; não é certificação automática.'}
  ]};
}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const a=await account(req.member);if(!a)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  try{
    const b=req.body||{},entity=clean(b.entity,40);
    if(req.method==='GET')return res.json(await snapshot(a.id));
    if(req.method==='POST'&&entity==='coupon'){
      const marketplace=clean(b.marketplace,30),code=clean(b.code,80),url=clean(b.url,1200);if(!STORES.includes(marketplace)||!code||!clean(b.title,160)||url&&!https(url))return res.status(400).json({error:'Cupom inválido. Confira loja, código, título e URL HTTPS.'});
      await db.query("INSERT INTO coupons(id,account_id,marketplace,code,title,url,discount_text,starts_at,ends_at,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE') ON CONFLICT(account_id,marketplace,code) DO UPDATE SET title=EXCLUDED.title,url=EXCLUDED.url,discount_text=EXCLUDED.discount_text,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,status='ACTIVE',updated_at=now()",[uid(),a.id,marketplace,code,clean(b.title,160),url,clean(b.discountText,120),b.startsAt||null,b.endsAt||null]);
    }else if(req.method==='POST'&&entity==='campaign'){
      const platform=clean(b.platform,30);if(!PLATFORMS.includes(platform)||!clean(b.name,140))return res.status(400).json({error:'Campanha inválida.'});
      await db.query('INSERT INTO growth_campaigns(id,account_id,name,platform,objective,daily_budget_cents,utm_source,utm_medium,utm_campaign) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[uid(),a.id,clean(b.name,140),platform,clean(b.objective,40)||'CLICKS',Math.max(0,Math.round(Number(b.dailyBudget||0)*100)),clean(b.utmSource,80),clean(b.utmMedium,80),clean(b.utmCampaign,120)]);
    }else if(req.method==='POST'&&entity==='connection'){
      const network=clean(b.network,30);if(!NETWORKS.includes(network))return res.status(400).json({error:'Canal inválido.'});
      await db.query("INSERT INTO social_connections(id,account_id,network,display_name,external_id,status) VALUES($1,$2,$3,$4,$5,'PENDING') ON CONFLICT(account_id,network) DO UPDATE SET display_name=EXCLUDED.display_name,external_id=EXCLUDED.external_id,status='PENDING',updated_at=now()",[uid(),a.id,network,clean(b.displayName,140),clean(b.externalId,200)]);
    }else if(req.method==='POST'&&entity==='privacyRequest'){
      const type=clean(b.requestType,30),email=clean(b.requesterEmail,240);if(!TYPES.includes(type)||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Solicitação ou e-mail inválido.'});
      await db.query("INSERT INTO privacy_requests(id,account_id,request_type,requester_email,notes,status) VALUES($1,$2,$3,$4,$5,'OPEN')",[uid(),a.id,type,email,clean(b.notes,1000)]);await audit(a.id,'PRIVACY_REQUEST','INFO',{type});
    }else if(req.method==='PUT'&&entity==='security'){
      const days=Math.max(30,Math.min(1825,Number(b.retentionDays)||365)),email=clean(b.incidentEmail,240);if(email&&!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'E-mail de incidentes inválido.'});
      await db.query('INSERT INTO account_security_settings(account_id,retention_days,marketing_consent_required,data_export_enabled,incident_email) VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id) DO UPDATE SET retention_days=EXCLUDED.retention_days,marketing_consent_required=EXCLUDED.marketing_consent_required,data_export_enabled=EXCLUDED.data_export_enabled,incident_email=EXCLUDED.incident_email,updated_at=now()',[a.id,days,b.marketingConsentRequired!==false,b.dataExportEnabled!==false,email]);await audit(a.id,'SECURITY_SETTINGS_UPDATED','INFO',{retentionDays:days});
    }else if(req.method==='DELETE'&&['coupon','campaign','asset'].includes(clean(req.query.entity,30))){
      const table={coupon:'coupons',campaign:'growth_campaigns',asset:'content_assets'}[clean(req.query.entity,30)],removed=await db.query('DELETE FROM '+table+' WHERE id=$1 AND account_id=$2 RETURNING id',[clean(req.query.id,100),a.id]);if(!removed.rows.length)return res.status(404).json({error:'Registro não encontrado.'});
    }else return res.status(400).json({error:'Ação inválida.'});
    return res.json({ok:true,...await snapshot(a.id)});
  }catch(e){console.error('growth',e);return res.status(500).json({error:'Não foi possível concluir a operação.'})}
}
